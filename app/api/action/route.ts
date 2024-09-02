import { BASE_URL, connection, CRT_TOKEN_ADDRESS, PACK_PRICES, USDC_TOKEN_ADDRESS } from '@/constants'
import { blinksights } from '@/services/blinksight'
import { ActionGetResponse, ACTIONS_CORS_HEADERS, createPostResponse, MEMO_PROGRAM_ID } from '@solana/actions'
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { ComputeBudgetProgram, PublicKey, Transaction, TransactionInstruction, VersionedTransaction } from '@solana/web3.js'

async function getCRTBalance(wallet: string): Promise<number> {
  try {
    const ata2022 = getAssociatedTokenAddressSync(new PublicKey(CRT_TOKEN_ADDRESS), new PublicKey(wallet), false, TOKEN_2022_PROGRAM_ID)
    const balance = await connection.getTokenAccountBalance(ata2022)

    return Number(balance.value.uiAmount?.toLocaleString('en-US', { maximumFractionDigits: 4 }))
  } catch (error) {
    return 0
  }
}

function trimAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

export async function GET(req: Request) {
  const response: ActionGetResponse = await blinksights.createActionGetResponseV1(req.url, {
    type: 'action',
    icon: `${BASE_URL}/thumbnail.png`,
    title: 'Carrot Happy Farm 🥕',
    description: 'Grow Carrot (CRT) on your farm.',
    label: '',
    links: {
      actions: [
        {
          label: 'Your 🥕 Farm',
          href: '/api/action?scene=farm',
        },
        {
          label: '🥕 Store',
          href: '/api/action?scene=store',
        },
      ],
    },
  })

  return Response.json(response, {
    headers: ACTIONS_CORS_HEADERS,
  })
}

export const OPTIONS = GET

export async function POST(req: Request) {
  const body = (await req.json()) as { account: string; signature: string }
  const { searchParams } = new URL(req.url)

  const sender = new PublicKey(body.account)

  const scene = searchParams.get('scene') as Scene
  const action = searchParams.get('action') as ShopAction
  const pack = searchParams.get('pack') as Pack

  if (scene === 'farm') {
    const transaction = await createBlankTransaction(sender)

    const crtBalance = await getCRTBalance(sender.toString())

    const payload = await createPostResponse({
      fields: {
        links: {
          next: {
            type: 'inline',
            action: {
              description: generateDescription(crtBalance * 100),
              icon: getFarmImage(crtBalance * 100),
              label: '🥕 Farm',
              title: `${trimAddress(sender.toString())}'s 🥕 Farm`,
              type: 'action',
              links: {
                actions: [
                  {
                    label: 'Go to 🥕 Store',
                    href: '/api/action?scene=store',
                  },
                ],
              },
            },
          },
        },
        transaction: transaction,
      },
    })

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    })
  }

  if (scene === 'store') {
    if (action === 'buy') {
      const crtBalance = await getCRTBalance(sender.toString())

      const quoteResponse = await (
        await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=${USDC_TOKEN_ADDRESS}&outputMint=${CRT_TOKEN_ADDRESS}&amount=${
            PACK_PRICES[pack] * 1e6
          }&slippageBps=50`,
        )
      ).json()

      const { swapTransaction } = await (
        await fetch('https://quote-api.jup.ag/v6/swap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quoteResponse,
            userPublicKey: sender.toString(),
          }),
        })
      ).json()

      const payload = {
        links: {
          next: {
            type: 'inline',
            action: {
              description: generateDescription(crtBalance * 100),
              icon: getFarmImage(crtBalance * 100),
              label: '🥕 Farm',
              title: `${trimAddress(sender.toString())}'s 🥕 Farm`,
              type: 'action',
              links: {
                actions: [
                  {
                    label: 'Go to 🥕 Store',
                    href: '/api/action?scene=store',
                  },
                ],
              },
            },
          },
        },
        transaction: swapTransaction,
      }

      return Response.json(payload, {
        headers: ACTIONS_CORS_HEADERS,
      })
    }

    const transaction = await createBlankTransaction(sender)

    const payload = await createPostResponse({
      fields: {
        links: {
          next: {
            type: 'inline',
            action: {
              description: 'Packs of seeds to grow carrots in your farm.',
              icon: `${BASE_URL}/shop.png`,
              label: '🥕 Store',
              title: 'Carrot Store',
              type: 'action',
              links: {
                actions: [
                  {
                    label: 'Pack 1 (0.05 🥕)',
                    href: '/api/action?scene=store&action=buy&pack=1',
                  },
                  {
                    label: 'Pack 2 (0.2 🥕)',
                    href: '/api/action?scene=store&action=buy&pack=2',
                  },
                  {
                    label: 'Pack 3 (0.5 🥕)',
                    href: '/api/action?scene=store&action=buy&pack=3',
                  },
                  {
                    label: 'Pack 4 (1 🥕)',
                    href: '/api/action?scene=store&action=buy&pack=4',
                  },
                  {
                    label: 'Back to 🥕 Farm',
                    href: '/api/action?scene=farm',
                  },
                ],
              },
            },
          },
        },
        transaction: transaction,
      },
    })

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    })
  }

  return Response.json({
    success: true,
  })
}

type Scene = 'farm' | 'store'
type ShopAction = 'buy' | 'back'
type Pack = '1' | '2' | '3' | '4'

const createBlankTransaction = async (sender: PublicKey) => {
  const transaction = new Transaction()
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1000,
    }),
    new TransactionInstruction({
      programId: new PublicKey(MEMO_PROGRAM_ID),
      data: Buffer.from('This is a blank transaction'),
      keys: [],
    }),
  )
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  transaction.feePayer = sender

  return transaction
}

const getFarmImage = (balance: number): string => {
  if (balance === 0) {
    return `${BASE_URL}/farm/0.png`
  }

  if (balance < 30) {
    return `${BASE_URL}/farm/30.png`
  }

  if (balance > 450) {
    return `${BASE_URL}/farm/450.png`
  }

  for (let i = 30; i <= 450; i += 30) {
    if (balance < i) {
      return `${BASE_URL}/farm/${i}.png`
    }
  }

  return `${BASE_URL}/farm/30.png`
}

const calculateNextRest = (balance: number): string => {
  if (balance < 30) {
    return Number((30 - balance) / 100).toLocaleString()
  }

  if (balance > 450) {
    return 'Full'
  }

  for (let i = 30; i <= 450; i += 30) {
    if (balance < i) {
      return Number((i - balance) / 100).toLocaleString()
    }
  }

  return '0'
}

const generateDescription = (balance: number): string => {
  if (balance < 450) {
    return `You have ${(balance / 100).toLocaleString()} (CRT). Buy ${calculateNextRest(
      balance,
    )} more to grow one more 🥕. May need to reload after buy for new seed growth.`
  }

  return `You have ${(balance / 100).toLocaleString()} (CRT). New farm will open soon.`
}
