const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const fs = require('fs');

const path = require('path');
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}
const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    'min-width': 800,
    'min-height': 600,
    'accept-first-mouse': true,
    'title-bar-style': 'hidden',  
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      backgroundThrottling: false
    }
  });
  
  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
app.on("ready", ()=>{
  ipcMain.on('titlebar', (event, arg) => {
    switch(arg)
    {
      case "minimize":
        {
          var window = BrowserWindow.getFocusedWindow();
          window.minimize();
        }
        break;
      case "maximize":
        {
          var window = BrowserWindow.getFocusedWindow();
          if(window.isMaximized()){
              window.unmaximize();
          }else{
              window.maximize();
          }
        }
        break;
      case "close":
        {
          var window = BrowserWindow.getFocusedWindow();
          window.close();
        }
        break;
    }
  });
  
  ipcMain.on('save-dialog', async(event, arg) => {
    const result = await dialog.showSaveDialogSync(BrowserWindow.getFocusedWindow(), {
      defaultPath: __dirname,

      filters: [
        { name: 'SIESTA', extensions: ['fdf'] },
        { name: 'Все файлы', extensions: ['*'] }
      ]
    });
    var logger = fs.createWriteStream(result, {
      flags: 'w' // 'a' means appending (old data will be preserved)
    })
    arg.forEach(function(data, index) {
      if(Array.isArray(data.value))
      {
        //console.log(data);
        switch(data.name){
          case "atoms":
            let format = arg.find(el => el.name === "AtomicCoordinatesFormat");
            logger.write(`\r\n${format.name}\t\t\t${format.value}\r\n`)
            logger.write("%block AtomicCoordinatesAndAtomicSpecies\r\n");
            data.value.forEach(element => {
              logger.write(`${element.value.join("  ")}`+"  "+`${element.name}\r\n`)
            });
            logger.write("%endblock AtomicCoordinatesAndAtomicSpecies\r\n");
            logger.write("\r\n");
            break;
            
          case "species":
            logger.write("\r\n%block ChemicalSpeciesLabel\r\n");
            data.value.forEach(element => {
              logger.write(`${element.value.join("  ")}`+"  "+`${element.name}\r\n`)
            });
            logger.write("%endblock ChemicalSpeciesLabel\r\n");
            break;
        }
      } else {
        console.log(data.name);
        switch(data.name){
          case "CommentBlock":
            logger.write(`\r\n${data.value}\r\n`);
            break;
          default:
            logger.write(`${data.name}\t\t\t${data.value}\r\n`)
            break;
        }
      }
    });
    logger.close();
  });

})
