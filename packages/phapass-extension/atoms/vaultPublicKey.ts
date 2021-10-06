import { HexString } from '@polkadot/util/types'
import {atomWithStorage} from 'jotai/utils'

const vaultPublicKey = atomWithStorage<HexString | null>(
  'atom:vaultPublicKey',
  null
)

export default vaultPublicKey
