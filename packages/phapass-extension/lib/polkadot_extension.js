import { u8aToHex, hexToU8a } from '@polkadot/util';

export default class PolkadotExtension {
    constructor (extensionId, origin) {
        this.origin = origin;
        this.communication_port = chrome.runtime.connect(extensionId); 
        this.nextId = 0;
    }

    async decryptBytes(userAccount, bytesToEncrypt, recipientPublicKey){
        const id = ++this.nextId;
        const result = await this.sendRequest(id, 'pub(bytes.decrypt)', {"origin":this.origin, "data": u8aToHex(bytesToEncrypt),  "type": 'bytes', 
                            "address": userAccount.address, "recipientPublicKey": u8aToHex(recipientPublicKey)});
        return hexToU8a(result.decrypted);
    }

    async listAccounts(){
        return await this.sendRequest(++this.nextId, 'pub(accounts.list)', {"origin":this.origin});
    }

    async approveUs(){
        return await this.sendRequest(++this.nextId, 'pub(authorize.tab)', {"origin":this.origin});
    }


    async sendRequest(id, message, payload){
        const postMessagePromise = new Promise(resolve => {
            this.communication_port.onMessage.addListener((message)=>{ 
                if (message.id == id){
                    resolve(message.response);
                }
            });      
            this.communication_port.postMessage({id: id, message:message,"request":payload});
          });
          return await postMessagePromise;
    }
    
}