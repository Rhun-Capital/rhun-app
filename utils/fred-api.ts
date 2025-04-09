import axios from 'axios';

interface FredSeriesData {
  observations: Array<{
    date: string;
    value: number;
  }>;
  metadata: {
    id: string;
    title: string;
    units: string;
    frequency: string;
    seasonal_adjustment: string;
    last_updated: string;
    notes: string;
  };
}

export async function getFredSeriesData(seriesId: string): Promise<FredSeriesData> {
  const response = await axios.get(`/api/fred/series/${seriesId}`);
  return response.data;
} 