## GoldFin Kitchen - Chef Proposal & Contract System 🧑‍🍳

Welcome to GoldFin, a comprehensive web application designed for chefs and culinary professionals to streamline the process of creating, managing, and finalizing event proposals and contracts.

---

## Core Features

*   **Intelligent Dashboard**: Get an at-a-glance overview of your upcoming events, recent activities, and contracts awaiting deposits. The dashboard highlights proposals that need your attention.
*   **Event & Proposal Management**: Create detailed events for clients and attach multiple, distinct proposal options. Reorder proposals within an event using intuitive drag-and-drop.
*   **Contract Generation**: Automatically generate client-facing contracts from approved proposals, complete with financial summaries and terms.
*   **Reporting & Analytics**: A dedicated "Reports" tab with charts visualizing monthly revenue, event volume, contract pipeline status, and top-performing menu items.
*   **Advanced Calendar View**: A visual calendar displaying all events and contracts, with quick navigation by month and year. Features optional daily and monthly contract value totals.
*   **Template System**: Save entire proposals as templates to rapidly create new events for recurring or similar types of engagements.
*   **Library Management**: A centralized repository for all your business assets, including:
    *   `Menu Items`: Dishes with descriptions, pricing, and dietary tags.
    *   `Services`: Hourly or flat-rate services like staff, rentals, etc.
    *   `Dietary Restrictions`: A customizable list of tags (e.g., Vegan, Gluten-Free).
    *   `Symbols`: A palette of symbols (e.g., 🌱, 🌶️) for visually annotating menu items.
*   **Customer Management**: Maintain a library of your clients, including contact information, notes, and default dietary restrictions.
    *   **Quick Add**: Create new customers on-the-fly from the event creation screen without interrupting your workflow.

---

## Recent Enhancements

#### Dark Mode & Theming
The entire application has been rebuilt with a flexible theming system. You can now switch between a clean **Light Mode** and a new, eye-friendly **Dark Mode** using the toggle in the side panel.

#### Dynamic UI
*   **Sticky Header**: The main header now stays fixed at the top of the page as you scroll, keeping navigation always within reach.
*   **Dynamic Header**: The header starts with a stylish transparent fade effect and becomes solid as you scroll down, ensuring readability over content.
*   **Scroll to Top**: A convenient "Scroll to Top" button appears on long pages, allowing you to return to the top with a single click.
*   **Consistent Modal Interaction**: All modal dialogs now close when clicking the area outside the dialog, providing a more intuitive user experience.
*   **Smooth Transitions**: Switching themes and interacting with UI elements now includes subtle transitions for a more fluid and professional user experience.
*   **Touch-Friendly Controls**: All hover-activated buttons are now also triggered by a click, ensuring full functionality on touchscreen devices.
*   **Rich Text Editing**: Key text areas such as Internal Notes and Terms & Conditions now use a rich text editor, allowing for formatting like bold, italics, and lists.
*   **Themed Calendar Days**: The calendar view now features a subtle "ocean wave" themed border for enhanced visual appeal.
*   **Themed Dashboard Section Headers**: Dashboard sections like "Contracts Awaiting Deposit" and "Proposals Awaiting Approval" now have visually distinct headers that match their respective status colors, improving at-a-glance understanding.
*   **Parchment Print Previews**: Contract and BEO print previews now feature a classic parchment paper background for a professional, authentic document feel.

#### Cloud Sync (Optional)
For users who want to access their data across multiple devices, GoldFin now supports connecting to a private Google Firebase backend. This allows for real-time data synchronization. For detailed setup instructions, click the **Cloud Sync** button in the side panel.

#### Developer & Debugging Tools
*   **In-App Console Viewer**: A powerful debugging tool accessible from the side panel. It captures all console logs, warnings, and errors, displaying them in a readable, collapsible, and copyable format—perfect for troubleshooting on PWA or mobile devices.
*   **Proactive Error Reporting**: The application now automatically detects JavaScript errors and displays a simple notification dialog, ensuring issues don't go unnoticed.

---

## Getting Started

#### Local Mode
By default, GoldFin runs in **Local Mode**. All your data (events, libraries, settings) is saved securely in your browser's `localStorage`. No setup is required—just open the app and start creating.

#### Cloud Mode (Optional)
To enable data sync, you can connect the application to your own free Firebase project.
1.  Open the side panel (hamburger icon ☰).
2.  Click **Cloud Sync**.
3.  Follow the step-by-step instructions in the modal to create your project and configure the application.

---

## Advanced Features & Data Management

Beyond the core proposal and contract workflow, GoldFin includes several powerful features for data management, customization, and troubleshooting.

#### Cloud Sync Setup Details
While the app provides step-by-step instructions in the **Cloud Sync** modal, here is a summary of the process to connect to your own private Firebase backend:
1.  **Create a Firebase Project**: Use a free Google account to create a new project in the Firebase Console.
2.  **Create a Web App**: Inside your project, add a new Web App to get your configuration credentials.
3.  **Copy & Paste Config**: Paste the `firebaseConfig` object provided by Google into the Cloud Sync modal in GoldFin and verify it.
4.  **Enable Services**: In the Firebase Console, you must enable two key services:
    *   **Authentication**: Enable the `Google` sign-in provider.
    *   **Firestore Database**: Create a new database, starting in **Production Mode**.
5.  **Set Security Rules**: This is a critical step. You must replace the default Firestore security rules with the rules provided in the setup modal. This ensures that each user can only ever access their own data.

#### Data Backup and Migration (Export/Import)
Accessible from the side panel, these tools allow you to manage your data file directly.
*   **Export All Data**: This button gathers all your local data (events, libraries, customers, etc.) and bundles it into a single `.json` file that is downloaded to your computer. This is useful for creating backups.
*   **Import All Data**: This allows you to select a previously exported `.json` file to overwrite your current data.
    *   **In Local Mode**, this will replace all data in your browser.
    *   **In Cloud Mode**, the import process will first wipe all existing data from your cloud account and then upload the contents of the backup file.

#### Clearing Site Data (Hard Reset)
This is a powerful developer and troubleshooting tool in the side panel designed to perform a "hard reset" of the application's state within your browser. It is useful for fixing issues caused by corrupted local data or outdated cached application files.

When clicked, it performs the following actions:
1.  **Asks for Confirmation**: It first warns you about what will be deleted and what will be preserved. If you are in Cloud Mode, it will remind you that this action does **not** affect your cloud data.
2.  **Destroys Caches**: It unregisters the app's service worker and deletes all related browser caches. This forces your browser to download a completely fresh version of the application code on reload.
3.  **Wipes Local Data**: It removes all core application data (events, contracts, libraries, customers) from your browser's local storage.
4.  **Preserves Key Settings**: It intentionally does **not** delete your `Business Details` or `Cloud Sync` configuration, so you don't have to set them up again.
5.  **Reloads the App**: Finally, it reloads the page.

##### The End Result
When the page reloads, the outcome depends on your configuration:
*   **In Local Mode**: You will see a completely fresh version of the application with an empty database, as if you were visiting for the first time (but with your Business Details saved).
*   **In Cloud Mode**: Because your Cloud Sync settings are preserved, the app will reconnect to Firebase. It will then immediately begin downloading all your data from the cloud, automatically repopulating the application.

#### Appearance Customization
The side panel contains several toggles to customize the look and feel of the application:
*   **Dark Mode**: Switches between the standard light theme and a dark theme.
*   **Background Water Effect**: Toggles the animated, water-like effect on the application background.
*   **Overlay Animation**: Toggles the subtle, floating overlay animation.

These settings are saved to your `Business Details` and will sync across devices if you are using Cloud Mode.

---

## User Guide

This guide walks you through the core workflow of the GoldFin application, from initial setup to managing contracts and analyzing your business.

### 1. Initial Setup

Before creating events, it's recommended to set up your business details and libraries.

1.  **Enter Business Details**: Open the side panel (☰) and click **Business Details**. Fill in your company name, address, contact info, and default terms and conditions. This information will automatically populate your proposals and contracts.
2.  **Populate Your Libraries**: Open the side panel and click **Manage Library**. This is where you'll add the building blocks of your proposals:
    *   **Menu Items**: Add all your dishes, including descriptions, pricing, and dietary information.
    *   **Services**: Add all your billable services, such as staff, rentals, and fees.
    *   **Dietary Restrictions & Symbols**: Customize the tags and symbols used to classify your menu items.
    *   *Tip*: Use the **Quick Setup / Import** button to bulk-import a starter list of common menu items, services, and tags.
3.  **Add Customers**: Click **Customers** in the side panel to pre-load your existing client list. You can also add new customers on-the-fly later.

### 2. Creating an Event and Proposals

An "Event" is the main container for a client engagement. Each event can have multiple "Proposals," which are different options you can offer (e.g., a "Standard Package" vs. a "Premium Package").

1.  **Create the Event**:
    *   Navigate to the **Events** tab and click the large `+` button.
    *   *Tip*: You can also create an event by clicking the `+` button on a specific day in the **Calendar** tab, which will pre-fill the date.
2.  **Enter Client & Event Info**:
    *   In the editor, you can either type a new client's name or click the **Lookup** button to select from your customer library. If the customer doesn't exist, you can click the `+` button in the lookup dialog to add them without leaving the editor.
    *   Fill in the event details like date, description, and guest count.
3.  **Build the First Proposal**:
    *   Use the `+ Menu Item` and `+ Service` buttons to add line items from your library. You can adjust quantities, guest counts, and add client-facing notes for each item.
    *   Use the drag handles (`⠿`) to reorder items.
4.  **Save and Add More Options**:
    *   Click **Save Event**. The event will appear as a card in the "Events" list.
    *   On the event card, click the `+` button next to the proposal list. This will open a dialog allowing you to add another proposal option, either from a blank slate or by using a saved template.

### 3. Managing the Workflow

Once a proposal is created, you can manage its lifecycle.

1.  **Update Proposal Status**: On a proposal card, click the **"..."** menu to change its status from `Draft` to `Sent` (once you've sent it to the client) and then to `Approved` (once the client agrees).
2.  **Generate a Contract**: Once a proposal is `Approved`, a **Generate Contract** button will appear in its "..." menu. Clicking this will create a formal contract based on that proposal.
3.  **Manage the Contract**: Navigate to the **Contracts** tab. Here you can find the newly created contract and use its "..." menu to update its status through the payment pipeline (`Sent` -> `Accepted` -> `Deposit Paid` -> `Completed` -> `Paid In Full`).

### 4. Using the Dashboard & Reports

*   **Dashboard**: This is your command center. It provides an at-a-glance view of your most urgent items:
    *   **Upcoming Events**: A list of all events and contracts scheduled in the next 30 days.
    *   **Proposals Awaiting Approval**: A list of events where at least one proposal has been `Sent` but none have been `Approved` yet.
    *   **Contracts Awaiting Deposit**: A list of contracts that have been `Accepted` by the client but are still awaiting a deposit payment.
*   **Reports Tab**: This tab provides a high-level overview of your business performance through several key charts:
    *   **Monthly Revenue**: Shows the total value of all signed contracts for each month of the current year.
    *   **Contract Pipeline**: A donut chart showing the breakdown of all contracts by their current status.
    *   **Event Volume by Month**: Shows the total *number* of events scheduled for each month, useful for staffing and resource planning.
    *   **Top 5 Menu Items**: Ranks your most popular menu items based on how often they appear in signed contracts.

### 5. Printing and Sharing Documents

GoldFin generates professional, client-ready documents that can be printed or saved as a PDF.

1.  **Proposals & Contracts**:
    *   For a **Proposal**, click on its card to open the print preview.
    *   For a **Contract**, use the "..." menu on its card and select **View / Print Contract**.
    *   In the preview window, click the **Print** button. Your browser's print dialog will appear. Use the "Save as PDF" option in the print dialog to save a digital copy.
2.  **BEO (Banquet Event Order)**:
    *   For any signed contract, use the "..." menu and select **View BEO / Prep Sheet**.
    *   This provides a simplified, kitchen-focused view that omits pricing and includes quantities, perfect for your culinary team. It can also be printed or saved as a PDF.

---
## Reporting & Analytics

The "Reports" tab provides a high-level overview of your business performance through several key charts:
*   **Monthly Revenue**: A bar chart showing the total value of all signed contracts for each month of the current year.
*   **Contract Pipeline**: A donut chart showing the breakdown of all contracts by their current status (e.g., Sent, Accepted, Deposit Paid).
*   **Event Volume by Month**: A bar chart showing the total *number* of events scheduled for each month, which is useful for staffing and resource planning.
*   **Top 5 Menu Items**: A horizontal bar chart that ranks your most popular menu items based on how often they appear in signed contracts, providing insight into your best-selling dishes.

---

## Technical Details
*   **Architecture**: Implements a reactive **MVVM (Model-View-ViewModel)** pattern using vanilla JavaScript. A central `AppViewModel` manages all application state, which is wrapped in a `Proxy` to automatically trigger UI updates on any state change. This provides a single, reactive source of truth for the entire application.
*   **Frameworks**: None! Built with modern, vanilla JavaScript (ES6 Modules), HTML5, and CSS3.
*   **Styling**: Uses CSS Custom Properties (variables) for a fully themeable and maintainable stylesheet.
*   **Offline Capability**: Designed as a Progressive Web App (PWA), it can be "installed" on your device and will work offline in Local Mode.
