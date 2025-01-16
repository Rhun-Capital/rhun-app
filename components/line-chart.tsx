import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        borderColor: string;
        backgroundColor: string;
    }[];
}

export const NonMemoChart = ({ children }: { children: string }) => {
    const [chartData, setChartData] = useState<ChartData>({
        labels: [],
        datasets: [
            {
                label: 'Example Data',
                data: [],
                borderColor: 'rgb(75, 192, 122)',
                backgroundColor: 'rgba(75,192,192,0.2)',
            },
        ],
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setChartData((prevData) => {
                const newData = [...prevData.datasets[0].data, Math.floor(Math.random() * 100)];
                const newLabels = [...prevData.labels, new Date().toLocaleTimeString()];

                return {
                    labels: newLabels,
                    datasets: [
                        {
                            ...prevData.datasets[0],
                            data: newData,
                        },
                    ],
                };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return <Line data={chartData} >
         {children}
    </Line>;
};

export const ChartComponent = React.memo(
    NonMemoChart,
  (prevProps, nextProps) => prevProps.children === nextProps.children
);