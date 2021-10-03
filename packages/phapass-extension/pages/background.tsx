import {create as createPhala, PhalaInstance} from '@phala/sdk'
import type {ApiPromise} from '@polkadot/api'
import {toaster} from 'baseui/toast'
import {createApi} from 'lib/polkadotApi'
import Head from 'next/head'
import {useEffect, useState} from 'react'

const baseURL = '/'

const Background: Page = () => {
  console.log('Home')

  const [api, setApi] = useState<ApiPromise>()
  const [phala, setPhala] = useState<PhalaInstance>()

  useEffect(() => {
    createApi({
      endpoint: process.env.NEXT_PUBLIC_WS_ENDPOINT as string,
      types: {
        RandomNumber: 'u32',
        ContractOwner: {owner: 'AccountId'},
        Guess: {guess_number: 'RandomNumber'},
        GuessResult: {
          _enum: ['TooLarge', 'ToSmall', 'Correct'],
        },
        GuessError: {
          _enum: ['OriginUnavailable', 'NotAuthorized'],
        },
        GuessNumberRequestData: {
          _enum: {QueryOwner: null, Guess: 'Guess', PeekRandomNumber: null},
        },
        GuessNumberResponseData: {
          _enum: {
            Owner: 'AccountId',
            GuessResult: 'GuessResult',
            RandomNumber: 'RandomNumber',
          },
        },
        GuessNumberRequest: {
          head: 'ContractQueryHead',
          data: 'GuessNumberRequestData',
        },
        GuessNumberResponse: {
          nonce: '[u8; 32]',
          result: 'Result<GuessNumberResponseData, GuessError>',
        },
        GuessNumberCommand: {
          _enum: {NextRandom: null, SetOwner: 'ContractOwner'},
        },
      },
    })
      .then((api) => {
        setApi(api)
        return createPhala({api, baseURL}).then((phala) => {
          setPhala(() => phala)
        })
      })
      .catch((err) => {
        toaster.negative((err as Error).message, {})
      })
  }, [])

  return (
    <div>
      <Head>
        <title>Phala Password Manager Background Page</title>
      </Head>
    </div>
  )
}

export default Background
