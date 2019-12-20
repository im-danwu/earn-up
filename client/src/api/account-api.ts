import { apiEndpoint } from '../config'
// import { Reward } from '../types/Reward';
import Axios from 'axios'

export async function getAccountBalance(idToken: string): Promise<any> {
  console.log('Fetching account balance')

  const response = await Axios.get(
    `${apiEndpoint}/accounts/${idToken}/balance`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      }
    }
  )
  console.log('Account balance:', response.data)
  return response.data.item
}
