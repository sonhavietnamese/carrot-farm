import { Connection } from '@solana/web3.js'

export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL as string
export const connection = new Connection(process.env.HELIUS_RPC as string, 'confirmed')

export const CRT_TOKEN_ADDRESS = 'CRTx1JouZhzSU6XytsE42UQraoGqiHgxabocVfARTy2s'
export const USDC_TOKEN_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
export const USDC_DECIMALS = 6

export const SHYFT_API_KEY = process.env.SHYFT_API_KEY as string

export const PACK_PRICES = {
  1: 5,
  2: 20,
  3: 50,
  4: 100,
}
