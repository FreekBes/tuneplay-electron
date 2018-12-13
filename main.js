const electron = require('electron');

const dialog = electron.dialog;
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

let mainWindow;
let mainWindowId;
let currentThemeColor = "#FFCB2E";
let currentThemeFontColor = "#000000";

function urlIsIndex(url) {
    if (url.indexOf(".tuneplay.net/?") > -1 || url.indexOf(".tuneplay.net/index.php?") > -1 || url.slice(-14) == ".tuneplay.net/" || url.slice(-13) == ".tuneplay.net") {
        return true;
    }
    return false;
}

function isDarkColor(hexcolor){
    var r = parseInt(hexcolor.substr(1,2),16);
    var g = parseInt(hexcolor.substr(3,2),16);
    var b = parseInt(hexcolor.substr(4,2),16);
    var yiq = ((r*299)+(g*587)+(b*114))/1000;
    // Return new color if to dark, else return the original
    return (yiq < 40) ? '#2980b9' : hexcolor;
}

// Listen for app to be ready
app.on('ready', function() {
    // Create new window with preferences
    mainWindow = new BrowserWindow({
        show: false,
        frame: false,
        backgroundColor: '#1A1A1A',
        center: true,
        minWidth: 500,
        minHeight: 500,
        fullscreenable: false,
        title: "TunePlay",
        darkTheme: true,
        vibrancy: "dark",
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            devTools: true,
            defaultFontFamily: 'sansSerif',
            defaultFontSize: 15,
            nativeWindowOpen: true
        }
    });

    mainWindowId = mainWindow.id;

    // Load loadingscreen
    mainWindow.setMenu(null);
    mainWindow.loadURL('https://www.tuneplay.net/loading.php');
    mainWindow.once('ready-to-show', function() {
        // when the window is ready, load the main site
        // while loading, loading.php will still be shown
        mainWindow.maximize();
        mainWindow.show();
        mainWindow.loadURL('https://www.tuneplay.net');
        // mainWindow.webContents.openDevTools();
    });

    mainWindow.webContents.on('new-window', function(event, url, frameName, disposition, options, additionalFeatures, referrer) {
        event.preventDefault();
        Object.assign(options, {
            frame: true
        });
        let googleWindow = false;
        if (url.indexOf("//accounts.google.com/") > -1) {
            googleWindow = true;
            Object.assign(options, {
                skipTaskbar: true,
                alwaysOnTop: false,
                title: 'Sign in with Google',
                show: true,
                minimizable: false,
                maximizable: false,
                resizable: false,
                movable: true,
                useContentSize: true,
                fullscreenable: false,
                webPreferences: {
                    devTools: false,
                    nodeIntegration: false,
                    webSecurity: true,
                    safeDialogs: true
                }
            });
        }
        let newBrowserWindow = new BrowserWindow(options);
        newBrowserWindow.setMenu(null);
        if (googleWindow) {
            mainWindow.setFocusable(false);
            newBrowserWindow.on('closed', function(event) {
                mainWindow.setFocusable(true);
                mainWindow.focus();
                mainWindow.show();
            });
        }
        newBrowserWindow.on('page-title-updated', function(event, title) {
            newBrowserWindow.title = title;
        });
        newBrowserWindow.loadURL(url);
        event.newGuest = newBrowserWindow;
    });

    mainWindow.webContents.on('dom-ready', function(event) {
        if (!urlIsIndex(mainWindow.webContents.getURL())) {
            mainWindow.setMinimumSize(500, 500);

            mainWindow.webContents.executeJavaScript(`
                let winStyling = document.createElement('style');
                winStyling.innerHTML = 'body { border: solid 1px `+currentThemeColor+`; overflow: hidden; } #electron-titlebar { display: block; z-index: 99999; position: fixed; height: 32px; width: calc(100% - 2px); background: `+currentThemeColor+`; color: `+currentThemeFontColor+`; transition: color 1s, background 1s; padding: 4px; } #electron-titlebar #electron-drag-region { display: grid; grid-template-columns: auto 138px; width: 100%; height: 100%; -webkit-app-region: drag; } #electron-window-title { grid-column: 1; display: flex; align-items: center; font-family: "Segoe UI", sans-serif; font-size: 12px; margin-left: 8px; overflow: hidden; } #electron-window-title span { overflow: hidden; text-overflow: ellipsis; line-height: 1.5; } #electron-window-controls { display: grid; grid-template-columns: repeat(3, 46px); position: absolute; top: 0; right: 6px; height: 100%; font-family: "SEGOE MDl2 Assets"; font-size: 10px; -webkit-app-region: no-drag; } #electron-window-controls .electron-btn { grid-row 1 / span 1; display: flex; width: 46px; text-align: center; justify-content: center; align-items: center; width: 100%; height: 100%; user-select: none; cursor: default; opacity: 0.8; } #electron-window-controls .electron-btn:hover { background: rgba(255,255,255,0.2); opacity: 1; } #electron-window-controls #electron-min-btn { grid-column: 1; } #electron-window-controls #electron-max-btn, #electron-window-controls #electron-restore-btn { grid-column: 2; } #electron-window-controls #electron-close-btn { grid-column: 3; } #electron-window-controls #electron-close-btn:hover { background: #E81123; } #electron-window-controls #electron-restore-btn { display: none; } #electron-main { height: calc(100% - 34px); margin-top: 32px; overflow: auto; }';
                document.getElementsByTagName("head")[0].appendChild(winStyling);

                let titleBarElem = document.createElement('div');
                titleBarElem.id = "electron-titlebar";
                titleBarElem.innerHTML = '<div id="electron-drag-region"> <div id="electron-window-title"> <span id="electron-window-title-text">'+document.title+'</span> </div> <div id="electron-window-controls"> <div class="electron-btn" id="electron-min-btn"> <span>&#xE921;</span> </div> <div class="electron-btn" id="electron-max-btn"> <span>&#xE922;</span> </div> <div class="electron-btn" id="electron-restore-btn"> <span>&#xE923;</span> </div> <div class="electron-btn" id="electron-close-btn"> <span>&#xE8BB;</span> </div> </div> </div>';
                
                let mainContentElem = document.createElement('div');
                mainContentElem.id = "electron-main";
                
                const body = document.getElementsByTagName("body")[0];
                while(body.childNodes.length) {
                    mainContentElem.appendChild(body.firstChild);
                }
                body.appendChild(titleBarElem);
                body.appendChild(mainContentElem);

                const remote = require('electron').remote;
                let windowRem = remote.getCurrentWindow();
                
                const mainContent = document.getElementById('electron-main'),
                    titleBar = document.getElementById('electron-titlebar'),
                    minButton = document.getElementById('electron-min-btn'),
                    maxButton = document.getElementById('electron-max-btn'),
                    restoreButton = document.getElementById('electron-restore-btn'),
                    closeButton = document.getElementById('electron-close-btn');

                minButton.addEventListener("click", event => {
                    windowRem = remote.getCurrentWindow();
                    windowRem.minimize();
                });

                maxButton.addEventListener("click", event => {
                    windowRem = remote.getCurrentWindow();
                    windowRem.maximize();
                    toggleMaxRestoreButtons();
                });

                restoreButton.addEventListener("click", event => {
                    windowRem = remote.getCurrentWindow();
                    windowRem.unmaximize();
                    toggleMaxRestoreButtons();
                });

                // Toggle maximise/restore buttons when maximisation/unmaximisation
                // occurs by means other than button clicks e.g. double-clicking
                // the title bar:
                toggleMaxRestoreButtons();
                windowRem.on('maximize', toggleMaxRestoreButtons);
                windowRem.on('unmaximize', toggleMaxRestoreButtons);

                closeButton.addEventListener("click", event => {
                    windowRem = remote.getCurrentWindow();
                    windowRem.close();
                });

                function toggleMaxRestoreButtons() {
                    windowRem = remote.getCurrentWindow();
                    if (windowRem.isMaximized()) {
                        maxButton.style.display = "none";
                        restoreButton.style.display = "flex";
                        titleBar.style.height = "23px";
                        let titleBarHeight = titleBar.offsetHeight;
                        mainContent.style.marginTop = titleBarHeight+"px";
                        mainContent.style.height = "calc(100% - "+titleBarHeight+"px)";
                        body.style.width = "100%";
                        body.style.height = "100%";
                    } else {
                        restoreButton.style.display = "none";
                        maxButton.style.display = "flex";
                        titleBar.style.height = "32px";
                        let titleBarHeight = titleBar.offsetHeight;
                        mainContent.style.marginTop = titleBarHeight+"px";
                        mainContent.style.height = "calc(100% - "+titleBarHeight+"px)";
                        body.style.width = "initial";
                        body.style.height = "calc(100% - 2px)";
                    }
                }
            `);
        }
        else {
            mainWindow.setMinimumSize(1256, 500);
        }
    });

    mainWindow.webContents.on('did-change-theme-color', function(event, color) {
        if (color == null) {
            color = "#FFCB2E";
        }
        currentThemeColor = color;
        if (isDarkColor(color)) {
            currentThemeFontColor = "#000000";
        }
        else {
            currentThemeFontColor = "#FFFFFF";
        }

        mainWindow.webContents.executeJavaScript(`
            let titleBarElemCo = document.getElementById("electron-titlebar");
            if (titleBarElemCo != null) {
                titleBarElemCo.style.color = "`+currentThemeFontColor+`";
                titleBarElemCo.style.background = "`+currentThemeColor+`";
            }
        `);
    });

    mainWindow.on('page-title-updated', function(event, title) {
        // update page title, but do not do so on login.php
        if (mainWindow.webContents.getURL().indexOf(".tuneplay.net/login.php") == -1) {
            mainWindow.title = title;
            mainWindow.webContents.executeJavaScript(`document.getElementById("electron-window-title-text").innerHTML = decodeURIComponent("`+encodeURIComponent(title)+`");`);
        }
        else {
            mainWindow.title = "Sign in to TunePlay";
        }
    });

    mainWindow.webContents.on('context-menu', function(event, params) {
        // disable context menu
        event.preventDefault();
        return false;
    });

    mainWindow.webContents.on('will-navigate', function(event, url) {
        // make sure signing out works by clearing all storage data
        if (url.indexOf(".tuneplay.net/login.php") > -1 && url.indexOf("logout") > -1) {
            allWindows = BrowserWindow.getAllWindows();
            for (let i = 0; i < allWindows.length; i++) {
                if (allWindows[i].id != mainWindowId) {
                    allWindows[i].destroy();
                }
            }
            mainWindow.webContents.session.clearStorageData();
        }
    });

    mainWindow.webContents.on('did-navigate', function(event, url, httpResponseCode, httpStatusText) {
        
    });
});