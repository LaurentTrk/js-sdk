import type { InjectedAccount, InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { Signer, SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types'
import { connectExtension } from './chrome'
import { u8aToHex, hexToU8a} from '@polkadot/util'

// As we are using the Polkadot extension from another extension (the PhaPass one),
// we can't use the classic way (https://polkadot.js.org/docs/extension/usage) : extension are not injected in others extensions
// we need to use cross-extension messaging (https://developer.chrome.com/docs/extensions/mv3/messaging/#external)
// (and so we need a special Polkadot extension as the original one does not support external messaging)

const PolkadotExtensionId = 'pojddmoepiiamclkdbboejabojgjhfjc'
const PhaPassExtensionOrigin = 'PhaPass'

export const enablePolkadotExtension = async (): Promise<PolkadotExtension> => {
  const polkadotExtension: PolkadotExtension = {
    origin: PhaPassExtensionOrigin,
    communication_port: connectExtension(PolkadotExtensionId),
    nextId: 0,
    async listAccounts(){
      return await this.sendRequest(++this.nextId, 'pub(accounts.list)', {"origin":this.origin}) as InjectedAccount[];
    },
    async approveUs(){
        return await this.sendRequest(++this.nextId, 'pub(authorize.tab)', {"origin":this.origin});
    },
    async sendRequest(id: number, message: string, payload: any): Promise<any> {
      const postMessagePromise = new Promise(resolve => {
          this.communication_port.onMessage.addListener((receivedMessage: any)=>{ 
              if (receivedMessage.id == id){
                  resolve(receivedMessage.response);
              }
          });      
          this.communication_port.postMessage({id: id, message:message,"request":payload});
        });
        return await postMessagePromise;
    }  
  }
  await polkadotExtension.approveUs();
  return polkadotExtension
}

interface PolkadotExtension {
  origin: string
  communication_port: any
  nextId: number
  listAccounts : () => Promise<InjectedAccount[]>,
  approveUs : () => void,
  sendRequest : (id: number, message: string, payload: any) => Promise<any>
}

interface ExtensionSigner extends Signer {
  extension: PolkadotExtension
  nextId : number
  decryptBytes: (bytesToEncrypt: Uint8Array, recipientPublicKey: Uint8Array) => Promise<Uint8Array>
}

export const getSigner = async (
  account: InjectedAccountWithMeta
): Promise<ExtensionSigner> => {
  const polkadotExtension = await enablePolkadotExtension()
  polkadotExtension.approveUs()
  const extensionSigner: ExtensionSigner = {
    nextId: 0,
    extension: polkadotExtension,
    async signPayload(payload: SignerPayloadJSON){
      const id = ++this.nextId; 
      const result = await this.extension.sendRequest(id, 'pub(extrinsic.sign)', payload);
      console.log(result);
      return {
        ...result,
        id
      };    
    },
    async signRaw(raw: SignerPayloadRaw){
      const id = ++this.nextId; 
      const result = await this.extension.sendRequest(id, 'pub(bytes.sign)', raw);
      return {
        ...result,
        id
      };    
    },
    async decryptBytes(bytesToEncrypt: Uint8Array, recipientPublicKey: Uint8Array){
        const id = ++this.nextId;
        const result = await this.extension.sendRequest(id, 'pub(bytes.decrypt)', 
                            {"origin":this.extension.origin, "data": u8aToHex(bytesToEncrypt),  "type": 'bytes', 
                            "address": account.address, "recipientPublicKey": u8aToHex(recipientPublicKey)});
        return hexToU8a(result.decrypted);
    }

  }
  return extensionSigner
}


