export async function getAccountDetails(address: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SOLSCAN_BASE_URL}/account/detail?address=${address}`,
      {
        headers: {
          'content-Type': 'application/json',
          'token': process.env.SOLSCAN_API_KEY as string
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Solscan API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Return the raw response as the structure matches our needs
    return {
      success: data.success,
      data: {
        account: data.data.account,
        lamports: data.data.lamports,
        type: data.data.type,
        executable: data.data.executable,
        owner_program: data.data.owner_program,
        rent_epoch: data.data.rent_epoch,
        is_oncurve: data.data.is_oncurve
      },
      metadata: data.metadata
    };
  } catch (error) {
    console.error('Error fetching account details:', error);
    throw error;
  }
}

export async function makeSolscanRequest(endpoint: string, params: Record<string, any>): Promise<any> {
  const baseUrl = 'https://pro-api.solscan.io';
  const queryString = new URLSearchParams(params).toString();
  const url = `${baseUrl}/${endpoint}?${queryString}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': process.env.SOLSCAN_API_KEY as string
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Solscan API error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Check if the API returned a success status
    if (data.success === false) {
      throw new Error(`Solscan API error: ${data.message || 'Unknown error'}`);
    }

    return data.data; // Return the actual data from the response
  } catch (error) {
    console.error('Error making Solscan request:', error);
    throw error;
  }
}