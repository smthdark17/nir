const { ipcRenderer, dialog } = require('electron');

/*const { ipcRenderer } = require('electron')
console.log(ipcRenderer.sendSync('synchronous-message', 'ping')) // prints "pong"

ipcRenderer.on('asynchronous-reply', (event, arg) => {
  console.log(arg) // prints "pong"
})
ipcRenderer.send('asynchronous-message', 'ping')*/
(function () {

    function init() {
        // Minimize task
        document.getElementById("min-btn").addEventListener("click", (e) => {
            ipcRenderer.send('titlebar', 'minimize');
        });

        // Maximize window
        document.getElementById("max-btn").addEventListener("click", (e) => {
            ipcRenderer.send('titlebar', 'maximize');
        });

        // Close app
        document.getElementById("close-btn").addEventListener("click", (e) => {
            ipcRenderer.send('titlebar', 'close');
        });
        document.getElementById("save-btn").addEventListener("click", (e) => {
            ipcRenderer.send('save-dialog', formToFDF(e));
        });
    };

    document.onreadystatechange =  () => {
        if (document.readyState == "complete") {
            init();
        }
    };
})();