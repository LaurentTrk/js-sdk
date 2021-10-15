import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { hexToU8a, stringToU8a, u8aConcat, u8aToHex, u8aToString, u8aToU8a } from "@polkadot/util";
import { HexString } from "@polkadot/util/types";
import { getSigner } from './polkadotExtension';
const {
    mnemonicGenerate,
    mnemonicToMiniSecret,
    naclKeypairFromSeed,
    decodeAddress,
    naclDecrypt,
    naclEncrypt,
    randomAsU8a,
    convertPublicKeyToCurve25519, convertSecretKeyToCurve25519, naclSeal
  } = require('@polkadot/util-crypto');


const NONCE_SIZE = 24

const encrypt = (message: Uint8Array, secretKey: Uint8Array, recipientPublicKey: Uint8Array) => {
    // From https://github.com/polkadot-js/common/pull/1070/files
    const { nonce, sealed } = naclSeal(message, convertSecretKeyToCurve25519(secretKey), convertPublicKeyToCurve25519(recipientPublicKey));
    return u8aConcat(nonce, sealed);
}

export const createVaultSecrets = (account : InjectedAccountWithMeta) => {
    console.log('Create vault secrets')
    const vaultMnemonic = mnemonicGenerate();
    const vaultSeed = mnemonicToMiniSecret(vaultMnemonic);
    const vaultKeyPair = naclKeypairFromSeed(vaultSeed);
  
    const vaultSecret = randomAsU8a();
    const vaultSecretKeys = new Uint8Array([...vaultSecret, ...vaultKeyPair.secretKey]);
    const publicKey = decodeAddress(account.address);
    console.log(`userPublicKey: ${u8aToHex(publicKey)}`);
  
    const vaultEncryptedKeys = encrypt(vaultSecretKeys, vaultKeyPair.secretKey, publicKey);
    const vaultKeys = u8aToHex(u8aConcat(vaultKeyPair.publicKey, vaultEncryptedKeys));
    console.log(`vaultPublicKey: ${u8aToHex(vaultKeyPair.publicKey)}`);

    return { vaultKeys, vaultSecret}
}

export const decryptVaultSecrets = async (account : InjectedAccountWithMeta, vaultSecretKeys: Uint8Array, vaultPublicKey: Uint8Array) => {
    console.log('Decrypt existing vault secrets')
    const vaultDecryptedKeys = await (await getSigner(account)).decryptBytes(vaultSecretKeys,vaultPublicKey)
    const decryptedVaultSecret = vaultDecryptedKeys.slice(0, 32); 
    const decryptedVaultSecretKey = vaultDecryptedKeys.slice(32, vaultDecryptedKeys.length); 
    return { decryptedVaultSecret, decryptedVaultSecretKey }
}

export const encryptPassword = (password: string, secret: Uint8Array): string|undefined => {
    if (secret){
        const { encrypted, nonce } = naclEncrypt(stringToU8a(password),  secret)
        return u8aToHex(u8aConcat(nonce, encrypted))
    }
    return undefined
}

export  const decryptPassword = (encryptedPassword: string|undefined, secret: Uint8Array): string|undefined =>  {
    if (secret && encryptedPassword){
        const encryptedPasswordAsBytes = u8aToU8a(encryptedPassword)
        const encryptedPasswordAsHex = u8aToHex(encryptedPasswordAsBytes)
        console.log('encryptedPasswordAsHex', encryptedPasswordAsHex)
        const nonce = encryptedPasswordAsBytes.slice(0, NONCE_SIZE)
        const encrypted = encryptedPasswordAsBytes.slice(NONCE_SIZE, encryptedPasswordAsBytes.length)
        const decryptedPassword = naclDecrypt(encrypted, nonce, secret)
        return u8aToString(decryptedPassword)
    }
    return undefined
}
