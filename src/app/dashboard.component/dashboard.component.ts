import { Component, inject, effect, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FinanceService } from '../finance.service';
import { CategoryService } from '../category.service';
import Chart from 'chart.js/auto';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements AfterViewInit {
  public finance = inject(FinanceService);
  public catService = inject(CategoryService);
  public financeService = inject(FinanceService);

  @ViewChild('pieCanvas') pieCanvas!: ElementRef;
  @ViewChild('barCanvas') barCanvas!: ElementRef;

  private pieChart?: Chart;
  private barChart?: Chart;

  constructor() {
    // This effect runs every time any signal inside it (transactions, totalIncome, etc.) changes
    effect(() => {
      // 1. READ the signals here to establish dependency
      const income = this.finance.totalIncome();
      const expenses = this.finance.totalExpenses();
      const catTotals = this.finance.filteredCategoryTotals();
      const allCategories = this.catService.userCategories();

      // 2. Only run update if charts are actually ready
      if (this.pieChart && this.barChart) {
        this.syncChartsWithData2(income, expenses, catTotals, allCategories);
      }
    });
  }

  ngAfterViewInit() {
    this.initCharts();
    // Initial sync after view is ready
    this.syncChartsWithData();
  }

  private initCharts() {
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#ffffff' } } },
    };

    this.pieChart = new Chart(this.pieCanvas.nativeElement, {
      type: 'doughnut',
      data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
      options: commonOptions,
    });

    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Income', 'Expenses'],
        datasets: [{ data: [0, 0], backgroundColor: ['#22c55e', '#ef4444'] }],
      },
      options: { ...commonOptions, scales: { y: { ticks: { color: '#ffffff' } } } },
    });
  }

  // inside dashboard.component.ts

  private syncChartsWithData() {
    if (!this.pieChart || !this.barChart) return;

    // --- Update Pie Chart ---
    const catData = this.finance.filteredCategoryTotals(); // { 'Food': 200, 'Rent': 1200 }
    const labels = Object.keys(catData);
    const values = Object.values(catData);

    // Map each label to the color defined in your CategoryService
    const colors = labels.map((catName) => {
      const category = this.catService.userCategories().find((c) => c.name === catName);
      return category ? category.color : '#38bdf8'; // Fallback to blue if not found
    });

    this.pieChart.data.labels = labels;
    this.pieChart.data.datasets[0].data = values;
    this.pieChart.data.datasets[0].backgroundColor = colors; // Apply the array of unique colors
    this.pieChart.data.datasets[0].borderColor = 'rgba(15, 23, 42, 0.5)'; // Dark border between slices
    this.pieChart.data.datasets[0].borderWidth = 2;

    this.pieChart.update();

    // --- Update Bar Chart (Keeping your existing logic) ---
    this.barChart.data.datasets[0].data = [
      this.finance.totalIncome(), // Ensure these signals now use filteredTransactions!
      this.finance.totalExpenses(),
    ];
    this.barChart.update();
  }

  private syncChartsWithData2(
    income: number,
    expenses: number,
    catData: Record<string, number>,
    categories: any[],
  ) {
    // --- Update Bar Chart ---
    this.barChart!.data.datasets[0].data = [income, expenses];
    this.barChart!.update();

    // --- Update Pie Chart with Dynamic Colors ---
    const labels = Object.keys(catData);
    const values = Object.values(catData);

    // Map each slice to its category's color
    const colors = labels.map((catName) => {
      const match = categories.find((c) => c.name === catName);
      return match ? match.color : '#38bdf8'; // Fallback to blue
    });

    this.pieChart!.data.labels = labels;
    this.pieChart!.data.datasets[0].data = values;
    this.pieChart!.data.datasets[0].backgroundColor = colors;

    // Optional: Make the borders match the theme
    this.pieChart!.data.datasets[0].borderColor = 'rgba(15, 23, 42, 0.5)';

    this.pieChart!.update();
  }
}
