export function installMessageListener(onMessageCallback){
    chrome.runtime.onMessage.addListener(onMessageCallback);
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

export function sendMessage(message, callBack){
    return chrome.runtime.sendMessage(message, callBack);
}

export function enableOptionsPageDisplayOnButtonClick(){
    chrome.browserAction.onClicked.addListener(function () {
        chrome.tabs.create({ url: chrome.runtime.getURL("phapass.html") });
    })
}

export async function getCachedData(){
    const getLocalStoragePromise = new Promise(resolve => {
      chrome.storage.local.get(['userAccount'], function(data) {
          resolve(data);
        });
      });
      return await getLocalStoragePromise;
  }

export async function getCachedUserAccount(){
    const cachedData = await getCachedData()
    if (cachedData.hasOwnProperty('userAccount')){
        return cachedData['userAccount']
    }
    return undefined
}  

export async function cacheUserAccount(userAccount){
    chrome.storage.local.set({ userAccount: userAccount}, function () {
    });
}  