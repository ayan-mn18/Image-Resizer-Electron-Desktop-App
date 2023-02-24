const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const resizeImg = require('resize-img');

process.env.NODE_ENV = 'production';

const isMac = process.platform === 'darwin';
const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: 'Image Resizer',
        height: 600,
        width: isDev ? 1000 : 500,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
};

function createAboutWindow() {
    const aboutWindow = new BrowserWindow({
        title: 'About Image Resizer',
        height: 300,
        width: 300
    });

    aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'));
}

//App is ready
app.whenReady().then(() => {
    createMainWindow();

    //Menu
    // const menu = [
    //     {
    //         label: 'File',
    //         submenu: [
    //             {
    //                 label: 'Quit',
    //                 click: () => app.quit(),
    //                 //Short cuts
    //                 accelerator: 'CmdorCtrl+W'
    //             }
    //         ]
    //     }
    // ];

    //OR

    const menu = [
        ...(isMac
            ? [
                {
                    label: app.name,
                    submenu: [
                        {
                            label: 'About',
                            click: createAboutWindow,
                        },
                    ],
                },
            ]
            : []),
        {
            role: 'fileMenu',
            submenu: [
                {
                    label: 'Quit',
                    click: () => app.quit(),
                    //Short cuts
                    accelerator: 'CmdorCtrl+W'
                }
            ]
        },
        ...(!isMac
            ? [
                {
                    label: 'Help',
                    submenu: [
                        {
                            label: 'About',
                            click: createAboutWindow,
                        },
                    ],
                },
            ]
            : [])
    ];
    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    //So that no memory leaks 
    mainWindow.on('closed', () => (mainWindow = null));

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows.length === 0) {
            createMainWindow();
        }
    })

    //response to ipcRenderer resize
    ipcMain.on('image:resize', (e, options) => {
        options.dest = path.join(os.homedir(), 'imageResizer');
        resizeImage(options);
    });


    async function resizeImage({ imgPath, height, width, dest }) {
        try {
            const newPath = await resizeImg(fs.readFileSync(imgPath), {
                width: +width,
                height: +height
            });

            const filename = path.basename(imgPath);

            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest);
            }

            fs.writeFileSync(path.join(dest, filename), newPath);

            //Success Message
            mainWindow.webContents.send('image:done');

            shell.openPath(dest);
        } catch (error) {
            console.log(error);
        }
    }


    app.on('window-all-closed', () => {
        if (!isMac) {
            app.quit();
        }
    });
})