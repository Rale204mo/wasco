import React from 'react';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const LineChart = ({ data, title, darkMode }) => {
  const chartData = {
    labels: data.map(d => d.month || d.label),
    datasets: [
      {
        label: title,
        data: data.map(d => d.value || d.consumption || d.amount || d.revenue),
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: darkMode ? '#eee' : '#333' } },
      title: { display: true, text: title, color: darkMode ? '#eee' : '#333' },
    },
    scales: {
      y: { ticks: { color: darkMode ? '#eee' : '#333' }, grid: { color: darkMode ? '#333' : '#ddd' } },
      x: { ticks: { color: darkMode ? '#eee' : '#333' }, grid: { color: darkMode ? '#333' : '#ddd' } },
    },
  };

  return <Line data={chartData} options={options} />;
};

export const BarChart = ({ data, title, darkMode }) => {
  const chartData = {
    labels: data.map(d => d.month || d.label || d.category),
    datasets: [
      {
        label: title,
        data: data.map(d => d.value || d.count || d.total),
        backgroundColor: '#0d6efd',
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: darkMode ? '#eee' : '#333' } },
      title: { display: true, text: title, color: darkMode ? '#eee' : '#333' },
    },
    scales: {
      y: { ticks: { color: darkMode ? '#eee' : '#333' }, grid: { color: darkMode ? '#333' : '#ddd' } },
      x: { ticks: { color: darkMode ? '#eee' : '#333' }, grid: { color: darkMode ? '#333' : '#ddd' } },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export const PieChart = ({ data, title, darkMode }) => {
  const chartData = {
    labels: data.map(d => d.label || d.status),
    datasets: [
      {
        data: data.map(d => d.value || d.count || d.amount),
        backgroundColor: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1'],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: darkMode ? '#eee' : '#333' } },
      title: { display: true, text: title, color: darkMode ? '#eee' : '#333' },
    },
  };

  return <Pie data={chartData} options={options} />;
};

export const DoughnutChart = ({ data, title, darkMode }) => {
  const chartData = {
    labels: data.map(d => d.label || d.status),
    datasets: [
      {
        data: data.map(d => d.value || d.count || d.amount),
        backgroundColor: ['#0d6efd', '#ffc107', '#198754', '#dc3545'],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: darkMode ? '#eee' : '#333' } },
      title: { display: true, text: title, color: darkMode ? '#eee' : '#333' },
    },
  };

  return <Doughnut data={chartData} options={options} />;
};