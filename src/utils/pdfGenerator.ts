/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Trip, Expense } from '../types';
import { calculateBalances } from './expenseCalculator';
import { getCurrencySymbol } from '../data';

export function generateTripReportPDF(trip: Trip, expenses: Expense[]): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { totalSpent, friendBalances, categorySpent, debts } = calculateBalances(trip, expenses);
  const currencySymbol = getCurrencySymbol(trip.baseCurrency);

  let y = 15; // vertical cursor starting location in mm

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > 280) {
      doc.addPage();
      y = 15;
      // Draw small page header
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Trip Report: ${trip.name} (Continued)`, 15, y);
      doc.line(15, y + 2, 195, y + 2);
      y += 8;
    }
  }

  // --- Title Header ---
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(0, 0, 210, 40, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('TRAVEL EXPENSE & SPLIT REPORT', 15, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(220, 220, 255);
  doc.text(`Trip: ${trip.name} (${trip.destination})`, 15, 26);
  doc.text(`Dates: ${trip.startDate} to ${trip.endDate}`, 15, 32);

  // Set initial Y below header band
  y = 48;

  // --- Summary Box ---
  checkPageBreak(35);
  doc.setFillColor(243, 244, 246); // Gray-100
  doc.roundedRect(15, y, 180, 26, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('TRIP BUDGET', 20, y + 8);
  doc.text('TOTAL SPENT', 80, y + 8);
  doc.text('STATUS', 140, y + 8);

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(`${currencySymbol}${trip.budget.toLocaleString()}`, 20, y + 16);
  doc.text(`${currencySymbol}${totalSpent.toLocaleString()}`, 80, y + 16);

  const budgetLeft = trip.budget - totalSpent;
  if (budgetLeft >= 0) {
    doc.setTextColor(16, 185, 129); // Emerald-500
    doc.text('Under Budget', 140, y + 16);
    doc.setFontSize(8);
    doc.text(`${currencySymbol}${budgetLeft.toLocaleString()} available`, 140, y + 21);
  } else {
    doc.setTextColor(239, 68, 68); // Red-500
    doc.text('Over Budget!!', 140, y + 16);
    doc.setFontSize(8);
    doc.text(`${currencySymbol}${Math.abs(budgetLeft).toLocaleString()} exceeded`, 140, y + 21);
  }

  y += 34;

  // --- Category Breakdown ---
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Category-wise Breakdown', 15, y);
  
  // horizontal rule
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.line(15, y + 2, 195, y + 2);
  y += 8;

  categorySpent.forEach(cat => {
    checkPageBreak(10);
    // Render Category row
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    
    // Capitalize category name
    const catName = cat.category.charAt(0).toUpperCase() + cat.category.slice(1);
    doc.text(catName, 20, y);

    const limitStr = cat.limit > 0 ? ` / ${currencySymbol}${cat.limit}` : ' (No limit)';
    doc.text(`${currencySymbol}${cat.total.toLocaleString()}${limitStr}`, 70, y);

    // Progress bar representation
    const maxBarW = 50;
    const barW = cat.limit > 0 ? Math.min(maxBarW, (cat.total / cat.limit) * maxBarW) : 0;
    
    // draw background bar
    doc.setFillColor(241, 245, 249);
    doc.rect(130, y - 3, maxBarW, 3, 'F');
    // fill bar (red if over 100%, emerald otherwise)
    if (cat.limit > 0 && cat.total > cat.limit) {
      doc.setFillColor(239, 68, 68);
    } else {
      doc.setFillColor(16, 185, 129);
    }
    if (barW > 0) {
      doc.rect(130, y - 3, barW, 3, 'F');
    }

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${cat.percent}%`, 183, y);
    
    y += 7;
  });

  y += 5;

  // --- Balances Sheet ---
  checkPageBreak(45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Balances and Contributions', 15, y);
  doc.line(15, y + 2, 195, y + 2);
  y += 8;

  // Table Header
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Participant', 20, y);
  doc.text('Total Paid', 70, y);
  doc.text('Total Share', 110, y);
  doc.text('Net Balance Status', 150, y);
  doc.line(15, y + 1.5, 195, y + 1.5);
  y += 6;

  friendBalances.forEach(bal => {
    checkPageBreak(8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(bal.friendName, 20, y);
    doc.text(`${currencySymbol}${bal.totalPaid.toLocaleString()}`, 70, y);
    doc.text(`${currencySymbol}${bal.totalShare.toLocaleString()}`, 110, y);

    if (bal.netBalance > 0.01) {
      doc.setTextColor(16, 185, 129); // owes money
      doc.text(`Owed +${currencySymbol}${bal.netBalance.toLocaleString()}`, 150, y);
    } else if (bal.netBalance < -0.01) {
      doc.setTextColor(239, 68, 68); // owes money
      doc.text(`Owes -${currencySymbol}${Math.abs(bal.netBalance).toLocaleString()}`, 150, y);
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text('Settled', 150, y);
    }
    y += 7;
  });

  y += 4;

  // --- Settle-Up Checklist ---
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Suggested Settlements', 15, y);
  doc.line(15, y + 2, 195, y + 2);
  y += 8;

  if (debts.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Everyone is settled! No transactions required.', 20, y);
    y += 10;
  } else {
    debts.forEach(debt => {
      checkPageBreak(8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      
      // Draw checkbox square
      doc.rect(20, y - 3, 3, 3);
      doc.text(`${debt.fromName} pays ${debt.toName}`, 26, y);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${currencySymbol}${debt.amount.toLocaleString()}`, 120, y);
      y += 7;
    });
  }

  y += 5;

  // --- Expense Log Header ---
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Detailed Expense History', 15, y);
  doc.line(15, y + 2, 195, y + 2);
  y += 8;

  // Log Headers
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Item Description', 18, y);
  doc.text('Paid By', 80, y);
  doc.text('Original Amount', 115, y);
  doc.text(`Converted (${trip.baseCurrency})`, 155, y);
  doc.line(15, y + 1.5, 195, y + 1.5);
  y += 6;

  expenses.forEach(e => {
    checkPageBreak(12);
    doc.setFont('helvetica', 'normal');
    
    // Description and category
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    // Limit string length to fit index
    const desc = e.description.length > 28 ? e.description.substring(0, 25) + '...' : e.description;
    doc.text(desc, 18, y);

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const catFormatted = e.category.toUpperCase();
    doc.text(`${e.date} | ${catFormatted}`, 18, y + 4);

    // Paid by friend
    const payerFriend = trip.friends.find(f => f.id === e.payerId);
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(payerFriend ? payerFriend.name : 'Unknown', 80, y + 1);

    // Original Amount
    const origSym = getCurrencySymbol(e.currency);
    doc.text(`${origSym}${e.amount.toLocaleString()} ${e.currency}`, 115, y + 1);

    // Converted Amount
    doc.text(`${currencySymbol}${e.convertedAmount.toLocaleString()}`, 155, y + 1);

    // Draw separation line
    doc.setDrawColor(241, 245, 249);
    doc.line(15, y + 6, 195, y + 6);
    y += 9;
  });

  // Page numbering and footer values
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    // bottom margins
    doc.text(`Generated on 2026-05-31 | Page ${i} of ${pageCount}`, 15, 290);
    doc.text('Travel Expense Splitter App | Synced Locally (Offline)', 140, 290);
  }

  doc.save(`TripReport_${trip.name.replace(/\s+/g, '_')}.pdf`);
}
