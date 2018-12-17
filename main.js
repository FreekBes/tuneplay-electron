const { app, BrowserWindow, dialog, shell } = require('electron');
const ProgressBar = require('electron-progressbar');
const fetchJson = require('fetch-json');
const { download } = require('electron-dl');
const prettySize = require('prettysize');
const fs = require('fs');
const DiscordRPC = require('discord-rpc');
const discordClientID = '436830433880178689';
// const discord = require('discord-rich-presence')(discordClientID);

let mainWindow;
let mainWindowId;
let currentThemeColor = "#FFCB2E";
let currentThemeFontColor = "#000000";
let progressBar;

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
    checkForUpdates();
});

function checkForUpdates() {
    progressBar = new ProgressBar({
        title: 'TunePlay',
        text: 'Checking for updates...',
        detail: 'Fetching update logs...',
        indeterminate: true,
    });

    console.log("Checking for updates...");
    const updateLogUrl = 'https://www.tuneplay.net/appversion-windows.json';
    fetchJson.get(updateLogUrl).then(handleUpdateLog);
}

function handleUpdateLog(data) {
    if (Object.keys(data).length > 0) {
        if (data["latest_name_version"] != undefined && data["latest_name_version"] != null) {
            progressBar.detail = 'Reading update logs...';
            if (app.getVersion() != data["latest_name_version"]) {
                progressBar.text = 'An update is available!';
                console.log("An update is available!");
                if (fs.existsSync(__dirname + "/tuneplay-updater.exe")) {
                    progressBar.detail = 'Deleting old updater... This could take a minute or two.';
                    console.log("Deleting old updater... This could take a minute or two.");
                    fs.unlink(__dirname + "/tuneplay-updater.exe", function() {
                        console.log("File deleted!");
                        progressBar.detail = 'Starting download...';
                        downloadUpdate();
                    });
                }
                else {
                    console.log("No old updater to delete.");
                    progressBar.detail = 'Starting download...';
                    downloadUpdate();
                }
            }
            else {
                // no update is available
                console.log("No update available.");
                progressBar.text = "Starting TunePlay...";
                progressBar.detail = "";
                startTunePlay();
            }
        }
        else {
            console.log(data);
            console.warn("latest_app_version is not set!");
            progressBar.close();
            dialog.showErrorBox('Update checking error', 'An error occured while checking for updates.\n\nPlease reinstall TunePlay at tuneplay.net/app-download.php.');
            app.quit();
        }
    }
    else {
        console.warn("Something happened and the update logs are empty.");
        progressBar.close();
        dialog.showErrorBox('Update checking error', 'An error occured while checking for updates.\n\nPlease reinstall TunePlay at tuneplay.net/app-download.php.');
        app.quit();
    }
}

function downloadUpdate() {
    console.log("Loading new progressbar...");
    let dlProgressBar = new ProgressBar({
        title: 'TunePlay',
        text: 'Downloading update...',
        detail: 'Starting download...',
        indeterminate: false,
        initialValue: 0,
        maxValue: 100,
        closeOnComplete: false
    });
    progressBar.close();
    console.log("Starting download...");
    let downloadItem = null;
    download(BrowserWindow.getFocusedWindow(), 'https://www.tuneplay.net/downloads/tuneplay.exe', {
        saveAs: false,
        directory: __dirname,
        filename: 'tuneplay-updater.exe',
        showBadge: false,
        onStarted: function(dli) {
            console.log("Download started!");
            downloadItem = dli;
        },
        onProgress: function(progress) {
            console.log("Downloading update... " + (progress * 100) + "%");
            dlProgressBar.value = progress * 100;
            dlProgressBar.detail = prettySize(downloadItem.getReceivedBytes(), true, false, 1).padStart(6, ' ') + " / " + prettySize(downloadItem.getTotalBytes(), true, false, 1).padStart(6, ' ');
        },
        onCancel: function() {
            console.warn("Download canceled!");
            dlProgressBar.close();
            dialog.showErrorBox('Update downloading error', 'An error occured while downloading the update. The download was canceled.\n\nPlease reinstall TunePlay at tuneplay.net/app-download.php.');
            app.quit();
        }
    })
        .then(function(dl) {
            console.log("Download finished");
            console.log("Loading new progressbar...");
            let openProgressBar = new ProgressBar({
                title: 'TunePlay',
                text: 'Starting update installer... This might take a while.',
                detail: 'This window might not respond until the installer has been started.',
                indeterminate: true
            });
            dlProgressBar.close();
            setTimeout(function() {
                console.log("Opening updater...");
                let opened = shell.openItem(__dirname + "/tuneplay-updater.exe");
                openProgressBar.close();
                if (!opened) {
                    dialog.showErrorBox('An error occured', 'Could not open the TunePlay updater.\n\nPlease reinstall TunePlay at tuneplay.net/app-download.php.');
                }
                app.quit();
            }, 500);
        })
        .catch(function(error) {
            console.log(error);
            dlProgressBar.close();
            dialog.showErrorBox('Update downloading error', 'An error occured while downloading the update.\n\nPlease reinstall TunePlay at tuneplay.net/app-download.php.');
            app.quit();
        });
}

function startTunePlay() {
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
        },
        icon: __dirname + "/buildResources/icon.ico"
    });

    mainWindowId = mainWindow.id;

    // Load loadingscreen
    mainWindow.setMenu(null);
    mainWindow.loadURL('https://www.tuneplay.net/loading.php');
    mainWindow.once('ready-to-show', function() {
        // when the window is ready, load the main site
        // while loading, loading.php will still be shown
        progressBar.close();
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
            mainWindow.setEnabled(false);
            newBrowserWindow.on('closed', function(event) {
                mainWindow.setEnabled(true);
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

    let discordInterval = null;
    mainWindow.webContents.on('dom-ready', function(event) {
        if (!urlIsIndex(mainWindow.webContents.getURL())) {
            console.log("Opened random page");
            mainWindow.setMinimumSize(500, 500);
            if (discordInterval != null) {
                clearInterval(discordInterval);
                discordInterval = null;
            }

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
            console.log("Opened TunePlay player / index!");
            mainWindow.setMinimumSize(1256, 500);
            if (discordInterval == null) {
                console.log("Setting up discordInterval...");
                discordInterval = setInterval(updateDiscordRPC, 5000);
            }
            updateDiscordRPC();
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

    mainWindow.on('closed', function(event) {
        app.quit();
    });

    DiscordRPC.register(discordClientID);

    const discord = new DiscordRPC.Client({ transport: 'ipc' });
    let discordReady = false;

    discord.on('ready', function() {
        console.log('Discord RPC is ready!');
        discordReady = true;
    });

    function updateDiscordRPC() {
        if (urlIsIndex(mainWindow.getURL()) && discordReady) {
            // console.log("Fetching TunePlay playing details...");
            mainWindow.webContents.executeJavaScript(`JSON.stringify({
                currentTrack: player.currentTrack,
                playing: player.isPlaying,
                duration: player.getDuration(),
                currentTime: player.getCurrentTime(),
                type: player.type
            })`, false).then(function(result) {
                // console.log(result);
                setDiscordRPC(result);
            }).catch(function(error) {
                console.error(error);
            });
        }
        else {
            // console.log('Not index or discord not ready');
        }
    }

    function setDiscordRPC(tpInfo) {
        if (discordReady) {
            tpInfo = JSON.parse(tpInfo);
            if (tpInfo.currentTrack != null && Object.keys(tpInfo.currentTrack).length > 0) {
                let status = "playing";
                let startTimestamp = null;
                if (tpInfo.playing === true) {
                    startTimestamp = Math.floor(new Date().getTime() * 0.001) - tpInfo.currentTime;
                }
                else {
                    startTimestamp = 0;
                    status = "paused";
                }
                let details = tpInfo.currentTrack['title'];
                let state = tpInfo.currentTrack['artists_text'];
                let smallImgKey = null;
                let smallImgTxt = null;
                switch(tpInfo.type) {
                    case "tp":
                        smallImgKey = 'tp_icon';
                        smallImgTxt = 'Currently ' + status + ' ' + tpInfo.currentTrack['type_text'].toLowerCase() + ' via TunePlay';
                        break;
                    case "yt":
                        smallImgKey = 'yt_icon';
                        smallImgTxt = 'Currently ' + status + ' ' + tpInfo.currentTrack['type_text'].toLowerCase() + ' via YouTube';
                        break;
                    case "sc":
                        smallImgKey = 'sc_icon';
                        smallImgTxt = 'Currently ' + status + ' ' + tpInfo.currentTrack['type_text'].toLowerCase() + ' via Soundcloud';
                        break;
                    case "sp":
                        smallImgKey = 'sp_icon';
                        smallImgTxt = 'Currently ' + status + ' ' + tpInfo.currentTrack['type_text'].toLowerCase() + ' via Spotify';
                        break;
                    case "mc":
                        smallImgKey = 'mc_icon';
                        smallImgTxt = 'Currently ' + status + ' ' + tpInfo.currentTrack['type_text'].toLowerCase() + ' via Mixcloud';
                        break;
                    default:
                        smallImgKey = 'tp_icon';
                        smallImgTxt = 'Currently ' + status + ' ' + tpInfo.currentTrack['type_text'].toLowerCase();
                        break;
                }
                // console.log('Updating discord RPC to the right track');
                discord.setActivity({
                    details: details,
                    state: state,
                    largeImageKey: 'logo_square',
                    largeImageText: 'Sadly we cannot show cover art here due to the limitations of the Discord RPC API',
                    smallImageKey: smallImgKey,
                    smallImageText: smallImgTxt
                });
            }
            else {
                // console.log('Updating discord RPC to not playing any track');
                discord.setActivity({
                    details: 'Not playing any track',
                    state: 'Not playing any track',
                    largeImageKey: 'logo_square'
                });
            }
        }
    }

    discord.login({ clientId: discordClientID }).catch(console.error);
}