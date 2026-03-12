import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount, currency = 'USD') {
  const symbols = {
    USD: '$', EUR: '€', GBP: '£', INR: '₹',
    PKR: 'Rs', AED: 'د.إ', CAD: 'C$', AUD: 'A$',
  };
  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function maskAccountNumber(num) {
  if (!num || num.length <= 6) return num;
  return num.slice(0, 2) + '•'.repeat(num.length - 6) + num.slice(-4);
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = [
    { label: 'y', seconds: 31536000 },
    { label: 'mo', seconds: 2592000 },
    { label: 'd', seconds: 86400 },
    { label: 'h', seconds: 3600 },
    { label: 'm', seconds: 60 },
  ];
  for (const i of intervals) {
    const count = Math.floor(seconds / i.seconds);
    if (count > 0) return `${count}${i.label} ago`;
  }
  return 'just now';
}