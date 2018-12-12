const electron = require('electron');

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

let mainWindow;

// Listen for app to be ready
app.on('ready', function() {
    // Create new window
    mainWindow = new BrowserWindow({
        show: false,
        frame: false,
        backgroundColor: '#1A1A1A',
        center: true,
        minWidth: 1256,
        minHeight: 500,
        fullscreenable: false,
        title: "TunePlay",
        darkTheme: true,
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            devTools: true,
            defaultFontFamily: 'sansSerif',
            defaultFontSize: 15,
            nativeWindowOpen: true
        }
    });
    // Load loadingscreen
    mainWindow.loadURL('https://www.tuneplay.net/loading.php');
    mainWindow.once('ready-to-show', function() {
        mainWindow.maximize();
        mainWindow.show();
        mainWindow.loadURL('https://www.tuneplay.net');
        mainWindow.webContents.openDevTools();
    });
    mainWindow.on('page-title-updated', function(event, title) {
        mainWindow.title = title;
    });
});