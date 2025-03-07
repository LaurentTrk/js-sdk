import { PhalaInstance, CertificateData, randomHex } from "@phala/sdk"
import { ApiPromise } from "@polkadot/api"
import { hexAddPrefix, hexStripPrefix, hexToU8a, numberToHex } from "@polkadot/util"
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { createVaultSecrets, decryptPassword, encryptPassword } from "./crypto"
import { getSigner } from "./polkadotExtension"
import { State } from "baseui/input"

interface VaultState {
    api?: ApiPromise,
    phala?: PhalaInstance,
    account?: InjectedAccountWithMeta,
    secret?: Uint8Array,
    certificate?: CertificateData,
    vaultReady?: boolean    
}

interface Vault {
    state?: VaultState,
    setApi(api: ApiPromise): void,
    setPhala(phala: PhalaInstance): void,
    setAccount(account: InjectedAccountWithMeta): void,
    setCertificate(certificate: CertificateData): void,
    setSecret(secret: Uint8Array): void,
    secretIsSet(): boolean,
    userHasVault():  Promise<boolean>,
    userVaultIsReady():  boolean,
    createVault(onStatus: any): Promise<any>,
    getKeys(): Promise<Uint8Array | null | undefined>,
    getCredential(url: string): Promise<any>,
    listCredentials(): Promise<any>,
    addCredential(url: string, username: string, password: string, onStatus: any): Promise<any>,
    removeCredential(url: string, onStatus: any): Promise<any>
}


const vaultState: VaultState = {
    api : undefined,
    phala: undefined,
    secret: undefined,
    certificate: undefined,
    vaultReady: false
  }

const CONTRACT_ID = 7093

const vault:Vault = {
    state: vaultState,
    setApi: (api: ApiPromise): void => {
        vaultState.api = api
    },
    setPhala: (phala: PhalaInstance): void => {
        vaultState.phala = phala
    },
    setAccount: (account: InjectedAccountWithMeta): void => {
        vaultState.account = account
    },
    setCertificate: (certificate: CertificateData): void => {
        vaultState.certificate = certificate
    },
    setSecret: (secret: Uint8Array): void => {
        vaultState.secret = secret
    },
    secretIsSet:(): boolean => {
        return vaultState.secret !== undefined
    },
    userVaultIsReady:(): boolean => {
        return vaultState.vaultReady || false
    },
    userHasVault:async (): Promise<boolean> => {
        if (!vaultState.certificate || !vaultState.api || !vaultState.phala) return false
        const encodedQuery = vaultState.api.createType('PhapassRequest', {
            head: {
                id: numberToHex(CONTRACT_ID, 256),
                nonce: hexAddPrefix(randomHex(32)),
            },
            data: {hasAVault: null},
            })
            .toHex()
    
        const data: any  = await vaultState.phala.query(encodedQuery, vaultState.certificate)
        const { result: {ok, err} } = vaultState.api.createType('PhapassResponse', hexAddPrefix(data)).toJSON() as any
    
        if (ok) {
            vaultState.vaultReady = ok.hasAVault
            return ok.hasAVault;
        }
        vaultState.vaultReady = false
        return false;
    
    },
    createVault: async (onStatus: any) => {
        if (!vaultState.account || !vaultState.api || !vaultState.phala) return
        const { vaultKeys, vaultSecret } = createVaultSecrets(vaultState.account)
        vaultState.secret = vaultSecret;
        const signer = await getSigner(vaultState.account)
        const phalaCommandPromise = new Promise((resolve, reject) => {
            if (!vaultState.account || !vaultState.api || !vaultState.phala) {
                reject()
            }else{
                const commandId = resolve_when_command_has_been_executed(() => {
                    vaultState.vaultReady = true
                    resolve(vaultState.vaultReady)
                })
                vaultState.phala.command({
                    account: vaultState.account,
                    contractId: CONTRACT_ID,
                    payload: vaultState.api
                    .createType('PhapassCommand', {CreateVault: {
                        'command_id': commandId,
                        'keys': hexStripPrefix(vaultKeys)
                    }})
                    .toHex(),
                    signer,
                    onStatus: async (status: any) => {
                        onStatus(status)
                    },
                })
                .catch((err: any) => {
                    console.error(err)
                    reject(err)
                })
            }
        })
        return await phalaCommandPromise    },


    getKeys: async () => {
        if (!vaultState.certificate || !vaultState.api || !vaultState.phala) return
        const encodedQuery = vaultState.api
          .createType('PhapassRequest', {
            head: {
              id: numberToHex(CONTRACT_ID, 256),
              nonce: hexAddPrefix(randomHex(32)),
            },
            data: {getKeys: null},
          })
          .toHex()
    
        const data: any  = await vaultState.phala.query(encodedQuery, vaultState.certificate)
        const { result: {ok, err} } = vaultState.api.createType('PhapassResponse', hexAddPrefix(data)).toJSON() as any
    
        if (ok) {
            console.log(ok);
            const { keys } = ok
            return hexToU8a(hexAddPrefix(keys))
        }
        return null
    },
    getCredential: async (url: string) => {
        if (!vaultState.certificate || !vaultState.api || !vaultState.phala) return
        const encodedQuery = vaultState.api
          .createType('PhapassRequest', {
            head: {
              id: numberToHex(CONTRACT_ID, 256),
              nonce: hexAddPrefix(randomHex(32)),
            },
            data: {getCredential: url},
          })
          .toHex()
    
        const data: any  = await vaultState.phala.query(encodedQuery, vaultState.certificate)
        const { result: {ok, err} } = vaultState.api.createType('PhapassResponse', hexAddPrefix(data)).toJSON() as any
    
        if (ok) {
            const { existingCredentials } = ok
            if (vaultState.secret){
                existingCredentials.password = decryptPassword(hexAddPrefix(existingCredentials.password), vaultState.secret)
            }
            return existingCredentials
        }
        return null
    },
    listCredentials: async ():Promise<any> => {
        if (!vaultState.certificate || !vaultState.api || !vaultState.phala) return
        const encodedQuery = vaultState.api
          .createType('PhapassRequest', {
            head: {
              id: numberToHex(CONTRACT_ID, 256),
              nonce: hexAddPrefix(randomHex(32)),
            },
            data: {listCredentials: null},
          })
          .toHex()
    
        const data: any  = await vaultState.phala.query(encodedQuery, vaultState.certificate)
        const { result: {ok, err} } = vaultState.api.createType('PhapassResponse', hexAddPrefix(data)).toJSON() as any

        if (ok) {
            const { credentials } = ok
            return credentials
        }

        if (err) {
            throw new Error(err)
        }
        return []
    },
    addCredential: async (url: string, username: string, password: string, onStatus: any) => {
        if (!vaultState.account) return
        const signer = await getSigner(vaultState.account)
        const phalaCommandPromise = new Promise((resolve, reject) => {    
            if (!vaultState.account || !vaultState.api || !vaultState.phala) {
                reject()
            }else{
                const encryptedPassword = vaultState.secret ? encryptPassword(password, vaultState.secret):undefined
                console.log('encryptedPassword', encryptedPassword)
                const commandId = resolve_when_command_has_been_executed(resolve)
                vaultState.phala.command({
                    account:vaultState.account,
                    contractId: CONTRACT_ID,
                    payload: vaultState.api
                    .createType('PhapassCommand', {AddCredential: {
                        'command_id': commandId,
                        'url': url, 'username': username, 'password': hexStripPrefix(encryptedPassword)
                    }})
                    .toHex(),
                    signer,
                    onStatus: async (status: any) => {
                        onStatus(status)
                    },
                })
                .catch((err:any) => {
                    console.error(err)
                    reject(err)
                })
            }
        })
        return await phalaCommandPromise
      },
      removeCredential: async (url: string, onStatus) => {
        if (!vaultState.account) return
        const signer = await getSigner(vaultState.account)
        const phalaCommandPromise = new Promise((resolve, reject) => {    
            if (!vaultState.account || !vaultState.api || !vaultState.phala) {
                reject()
            }else{
                const commandId = resolve_when_command_has_been_executed(resolve)
                vaultState.phala.command({
                    account:vaultState.account,
                    contractId: CONTRACT_ID,
                    payload: vaultState.api
                    .createType('PhapassCommand', {RemoveCredential: {
                        'command_id': commandId,
                        'url': url
                    }
                    })
                    .toHex(),
                    signer,
                    onStatus: async (status: any) => {
                        onStatus(status)
                    },
                })
                .catch((err:any) => {
                    console.error(err)
                    reject(err)
                })
            }
        })
        return await phalaCommandPromise
      }
}

const resolve_when_command_has_been_executed = (resolve: any) => {
    const commandId = hexStripPrefix(randomHex())
    if (vaultState.api){
        let unsubscribe_events: any = undefined;
        vaultState.api.query.system.events((events) => {
            console.debug(`\nReceived ${events.length} events:`);
            events.forEach((record) => {
                // Extract the phase, event and the event types
                const { event, phase } = record;
                console.debug(`\t${event.section}:${event.method}:: (phase=${phase.toString()})`);
                if (event.section == 'phaPass' && event.method == 'CommandExecuted'){
                    console.log(event)
                    event.data.forEach((data:any) => {
                        console.log('Command : ', data)
                        if (data.has('command_id')){
                            console.log('Command has been executed', data.get('command_id') )
                            if (data.get('command_id') == commandId){
                                console.log('Command has been executed')
                                if (unsubscribe_events){
                                unsubscribe_events();
                                }
                                resolve({})
                                return
                            }                           
                        }
                      });
                    }
            });
        }).then((_unsub) => {
            unsubscribe_events = _unsub
        })
    }
    return commandId
}

export default vault