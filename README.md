# GitHub Copilot  Usage Metrics Viewer
📊 Interactive dashboard for visualising GitHub Copilot requests usage metrics and analytics

A web-based dashboard that provides insights into GitHub Copilot requests usage patterns, model distribution, user activity, and hourly trends. Built as a single-page application with no external dependencies.

🚀 Ready to use in seconds! Just open in your browser - no installation, no setup, no server required. All data processing happens locally for complete privacy.

<div style="display: flex; gap: 10px; align-items: center;">
  <img alt="GitHub Copilot Dashboard" src="https://img.shields.io/badge/GitHub-Copilot-blue?style=for-the-badge&amp;logo=github">
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&amp;logo=html5&amp;logoColor=white">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&amp;logo=javascript&amp;logoColor=black">
  <img alt="Chart.js" src="https://img.shields.io/badge/Chart.js-F5788D?style=for-the-badge&amp;logo=chart.js&amp;logoColor=white">
</div>

---

## ✨ Features
- 🔒 **Privacy-First**: All data processing happens locally in your browser - no external transmission
- ⚡ **Zero Setup**: Just open in any modern browser - no installation or configuration required
- 📊 **Overview Analytics**: Total users, requests, model distribution, and top users etc
- 🔍 **Advanced Analytics**: Hourly usage patterns, filtering by date, user, or model
- 💡 **Insights Dashboard**: Interactive charts, real-time search, and exportable filtered data
- 📅 **Multi-Month Support**: Store and switch between multiple months of data with automatic month detection
- 📈 **Month Comparison**: Track adoption progress, usage trends, and model preferences across multiple months

### Dashboard Preview

![Dashboard Screenshot](screenshots/screenshot1.png)

![Dashboard Screenshot](screenshots/screenshot2.png)

---

## 🚀 Getting Started

### Option 1: GitHub Pages (Recommended)
✨ Instant access: Deploy the dashboard to GitHub Pages and access it at: `https://[username].github.io/[repository-name]/`

### Option 2: Local Usage
📁 Download and go: Clone the repository and open `index.html` in your browser  
📊 Load your data: Click "📁 Load Data" and upload your GitHub Copilot metrics CSV file  
💡 No server required: The dashboard works directly from your file system - just double-click and open!

### Option 3: Clone/Fork and Deploy
Clone or fork the repository and run it with your own GitHub Actions to deploy to your own GitHub Pages or other hosting platforms. The included GitHub Actions workflow in `.github/workflows/deploy.yml` automatically deploys to GitHub Pages on push to the main branch.

---

## 🧪 Sample Data
A sample dataset (`data_example.csv`) is included in the repository to help you:
- Explore the dashboard features without your own data
- Understand the expected data format
- Test new features during development

The sample data includes:
- Timestamps, user identifiers, model names, and request counts
- Realistic usage patterns for testing and exploration

---

## 📋 Getting Your Data
Ready to see your own Copilot insights? Here's how to get your data in 3 simple steps:

1. Export your GitHub Copilot Premium Request Usage Report as a CSV file from your GitHub organization settings.
2. Ensure the file matches the expected format:
   ```csv
   date,username,product,sku,model,quantity,unit_type,applied_cost_per_quantity,gross_amount,discount_amount,net_amount,exceeds_quota,total_monthly_quota,organization,cost_center_name
   2025-10-01,user1,copilot,copilot_requests_o1_preview,o1-preview,1,request,0.04,0.04,0,0.04,false,1000,YourOrg,
   ```
3. Load the file into the dashboard by clicking "📁 Load Data".

### Multi-Month Data Management
The dashboard now supports storing and managing data for multiple months:

- **Automatic Month Detection**: When you upload a CSV file, the dashboard automatically detects the year and month from the data timestamps and labels it accordingly (e.g., "October 2025").
- **Date Range Filter**: The Date Range filter now serves as your month selector:
  - **All Time (All Months)**: Combines and displays data from all uploaded months
  - **Individual Months**: Select a specific month to view only that month's data
- **Auto-Selection on Upload**: When you upload new data, the dashboard automatically selects that month in the Date Range filter
- **Clear Month Button**: When viewing a specific month, a "Clear Month" button appears on the right side of the filter bar to delete that month's data
- **Data Persistence**: Each month's data is stored separately in your browser's local storage, allowing you to compare different periods

**How to use**:
1. Upload CSV files from different months - each is stored and labeled automatically
2. Use the Date Range filter to switch between "All Time" (all months combined) or individual months
3. When viewing a specific month, click "Clear Month" to delete that month's data
4. The dashboard remembers your selection between sessions

**Tip**: Start with "All Time" to see trends across all your data, then drill down to specific months for detailed analysis.

### Month-to-Month Comparison
Once you have uploaded data from at least 2 months, access the **Month Comparison** tab to:

- **Track Engagement Distribution**: Visualize how user activity quartiles evolve over time, showing the full spectrum from low to high engagement users with shaded areas between quartiles
- **Monitor Usage Trends**: Compare total requests and average requests per user across months to understand engagement depth
- **Analyze Model Preferences**: View model usage evolution with stacked area charts showing how model preferences shift over time
- **Measure Quota Efficiency**: Track average quota utilization trends to identify capacity planning needs
- **Understand Engagement**: See user distribution across high/medium/low engagement tiers month-over-month
- **Growth Indicators**: Stat cards show month-over-month percentage changes for key metrics with color-coded growth indicators

The comparison dashboard automatically updates when you upload new months or delete old data.

---

## 🛠️ Technical Details
- **Built With**: HTML5, CSS3, vanilla JavaScript, and Chart.js
- **Browser Compatibility**: Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- **Performance**: Client-side CSV parsing for fast data loading and efficient filtering

---

## 📖 Usage Examples
- **Enterprise Teams**: Monitor GitHub Copilot Premium request adoption, track usage trends, and optimize licensing
- **Individual Developers**: Personal productivity tracking, model-specific insights, and usage patterns

---

## 🤝 Contributing
We welcome contributions! Please see `CONTRIBUTING.md` for guidelines.

1. Fork the repository  
2. Create a feature branch  
3. Make changes  
4. Test thoroughly  
5. Submit a pull request  

---

## 📄 License
This project is licensed under the MIT License - see the `LICENSE` file for details.

---

## 🆘 Support
For issues, questions, or contributions:
- Check the [Issues](../../issues) section
- Create a new issue with detailed information
- Consider contributing improvements via pull requests

---

Built with ❤️ for GitHub Copilot users who want to understand their usage patterns.