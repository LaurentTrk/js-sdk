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
    ListedCredential: {
      url: 'String',
      username: 'String',
    },
    PhapassError: {
      _enum: ['OriginUnavailable', 'VaultAlreadyExists', 'NoVault', 'NoCredential', 'NotAuthorized'],
    },
    PhapassRequestData: {
      _enum: {HasAVault: null,  GetKeys: 'String', GetCredential: 'String', ListCredentials: null},
    },
    PhapassResponseData: {
      _enum: {
        HasAVault: 'bool',
        Keys: 'String',
        ExistingCredentials: 'PhapassCredential',
        Credentials: 'Vec<ListedCredential>'
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
      _enum: {CreateVault: 'String', AddCredential: 'UrlCredential', RemoveCredential: 'String'},
    },
  }