// telebirr_calls.ts
import axios from 'axios';

export async function teleBirrCoreCall(reqheaders: any, reqmethod: string, reqbody: any): Promise<any> {
  try {
    const response = await axios.post('https://api.example.com/telebirr', reqbody, { headers: reqheaders });
    return { status: 200, data: response.data };
  } catch (error: any) {
    return { status: 500, message: error.message };
  }
}