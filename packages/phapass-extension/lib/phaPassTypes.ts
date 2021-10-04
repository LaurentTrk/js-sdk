export const types = {
    ContractOwner: {owner: 'AccountId'},
    PhapassCredential: {
      username: 'String',
      password: 'String',
    },
    UrlCredential: {
      url: 'String',
      username: 'String',
      password: 'String',
    },
    PhapassError: {
      _enum: ['OriginUnavailable', 'VaultAlreadyExists', 'NoVault', 'NoCredential', 'NotAuthorized'],
    },
    PhapassRequestData: {
      _enum: {HasAVault: null, GetCredential: 'String'},
    },
    PhapassResponseData: {
      _enum: {
        HasAVault: 'bool',
        ExistingCrdentials: 'PhapassCredential'
      },
    },
    PhapassRequest: {
      head: 'ContractQueryHead',
      data: 'PhapassRequestData',
    },
    PhapassResponse: {
      nonce: '[u8; 32]',
      result: 'Result<PhapassResponseData, PhapassError>',
    },
    PhapassCommand: {
      _enum: {CreateVault: null, AddCredential: 'UrlCredential'},
    },
  }