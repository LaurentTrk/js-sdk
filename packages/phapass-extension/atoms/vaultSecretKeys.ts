import { HexString } from '@polkadot/util/types'
import {atomWithStorage} from 'jotai/utils'

const vaultSecretKeys = atomWithStorage<HexString | null>(
  'atom:vaultSecretKeys',
  null
)

export default vaultSecretKeys
