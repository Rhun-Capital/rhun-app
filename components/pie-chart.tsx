import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export const NonMemoPieChart = ({ children }: { children: string }) => {
    const data = {
        labels: ['Solana', 'Ethereum', 'Base'],
        datasets: [
            {
                label: 'TVL Breakdown',
                data: [30, 50, 20], // Example data, replace with actual TVL values
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };
    

    const options = {
        plugins: {
            datalabels: {
                color: 'white',
                anchor: 'end',
                align: 'end',
                labels: {
  
                    value:  {
                        font: {
                            size: 24
                        }
                    }
                },
                formatter: (value: number) => `${value}%`,
            },
        },
    };

    return (
        <div className="pt-20 pb-20">
            <h1 className="pb-10 text-xl">TVL Breakdown by Chain</h1>
            {/* TODO fix options here */}
            {/* <Pie data={data} options={options} /> */}
        </div>
    );
};

export const PieChart = React.memo(
    NonMemoPieChart,
  (prevProps, nextProps) => prevProps.children === nextProps.children
);