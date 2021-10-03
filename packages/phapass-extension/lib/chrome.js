export function installMessageListener(){
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            console.log(sender.tab ?
                        "from a content script:" + sender.tab.url :
                        "from the extension");
            const sanitizedUrl = sender.tab.url.split('?')[0];
            // if (request.command === "get"){
            //     const credential = vault.getCredentialForUrl(sanitizedUrl)
            //     if (credential){
            //     sendResponse(credential);
            //     }else{
            //     sendResponse({error: `No credential for ${sanitizedUrl}`});
            //     }
            // } else if (request.command === "set"){
            //     sendNotification('Saving a new credential for ' + sanitizedUrl);
            //     vault.saveCredential(sanitizedUrl, request.username, request.password);
            // }
        }
    );
}

export function sendNotification(message){
    chrome.notifications.create('test', {title: 'PhaPass', iconUrl: 'phala-34.png', message: message, type: 'basic'});
}
  
export function openOptionsPage(){
    chrome.runtime.openOptionsPage();
}

export function connectExtension(extensionId){
    return chrome.runtime.connect(extensionId);
}