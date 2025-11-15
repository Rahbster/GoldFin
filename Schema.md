# GoldFin - Data Schema

This document outlines the data structure for all major entities stored within the GoldFin application, whether in `localStorage` (Local Mode) or Firestore (Cloud Mode).

---

## 1. Event

An Event is the top-level container for a client engagement. It holds all the core details about the event itself and contains one or more `Proposal` options.

**Collection:** `events`

| Field                 | Type                | Description                                                                 |
| --------------------- | ------------------- | --------------------------------------------------------------------------- |
| `id`                  | `string`            | Unique identifier (e.g., `evt_1678886400000`).                               |
| `createdAt`           | `string` (ISO)      | The date and time the event was created.                                    |
| `clientName`          | `string`            | The name of the client or event.                                            |
| `customerId`          | `string`            | The ID of the associated record in the `customers` collection.              |
| `eventDate`           | `string` (YYYY-MM-DD) | The date of the event.                                                      |
| `eventLocation`       | `string`            | The physical address or location of the event.                              |
| `eventDescription`    | `string`            | A brief, high-level description of the event.                               |
| `guestCount`          | `number`            | The estimated number of guests.                                             |
| `constraints`         | `Array<string>`     | An array of default dietary restrictions for the event (e.g., `["Vegan"]`). |
| `clientPhone`         | `string`            | The client's phone number.                                                  |
| `clientContact`       | `string`            | The client's primary email address.                                         |
| `eventStartTime`      | `string` (HH:MM)    | The scheduled start time of the event.                                      |
| `eventDuration`       | `number`            | The duration of the event in hours.                                         |
| `preEventDuration`    | `number`            | The duration of setup time in hours.                                        |
| `postEventDuration`   | `number`            | The duration of cleanup time in hours.                                      |
| `notes`               | `string` (HTML)     | Internal notes for the event, not visible to the client.                    |
| `termsAndConditions`  | `string` (HTML)     | The specific terms and conditions for this event.                           |
| `isArchived`          | `boolean`           | If `true`, the event is hidden from the main list and appears in the archive view. |
| `proposals`           | `Array<Proposal>`   | An array of one or more `Proposal` objects associated with this event.      |

### 1.1. Proposal (Embedded in Event)

A Proposal represents a specific package or option offered for an event. An event can have multiple proposals.

| Field       | Type                      | Description                                                              |
| ----------- | ------------------------- | ------------------------------------------------------------------------ |
| `id`        | `string`                  | Unique identifier (e.g., `prop_1678886400000`).                          |
| `name`      | `string`                  | The name of this proposal option (e.g., "Premium Package").              |
| `status`    | `string`                  | The current status: `Draft`, `Sent`, or `Approved`.                      |
| `sortOrder` | `number`                  | An integer representing the display order of this proposal within its event. |
| `notes`     | `string` (HTML)           | Internal notes specific to this proposal option.                         |
| `menuItems` | `Array<MenuItemLine>`     | An array of menu items included in this proposal.                        |
| `services`  | `Array<ServiceLine>`      | An array of services included in this proposal.                          |

---

## 2. Contract

A Contract is generated from an `Approved` proposal. It freezes the details of the engagement and is used for client sign-off and financial tracking.

**Collection:** `contracts`

| Field                 | Type                      | Description                                                                 |
| --------------------- | ------------------------- | --------------------------------------------------------------------------- |
| `id` / `contractId`   | `string`                  | Unique identifier (e.g., `cont_1678886400000`).                             |
| `eventId`             | `string`                  | The ID of the parent `Event` this contract was generated from.              |
| `proposalId`          | `string`                  | The ID of the `Proposal` this contract was generated from.                  |
| `contractDate`        | `string` (ISO)            | The date the contract was generated.                                        |
| `status`              | `string`                  | The contract's status: `Sent`, `Accepted`, `Deposit Paid`, `Completed`, `Paid In Full`. |
| `isArchived`          | `boolean`                 | If `true`, the contract is hidden from the main list and appears in the archive view. |
| `depositAmount`       | `number`                  | The calculated deposit amount.                                              |
| `statusHistory`       | `Array<Object>`           | An array tracking status changes: `{ from, to, date }`.                     |
| `clientName`          | `string`                  | *Copied from Event.*                                                        |
| `customerId`          | `string`                  | *Copied from Event.*                                                        |
| `eventDate`           | `string` (YYYY-MM-DD)     | *Copied from Event.*                                                        |
| `eventLocation`       | `string`                  | *Copied from Event.*                                                        |
| `eventDescription`    | `string`                  | *Copied from Event.*                                                        |
| `guestCount`          | `number`                  | *Copied from Event.*                                                        |
| `constraints`         | `Array<string>`           | *Copied from Event.*                                                        |
| `eventStartTime`      | `string` (HH:MM)          | *Copied from Event.*                                                        |
| `menuItems`           | `Array<MenuItemLine>`     | *Copied from Proposal.*                                                     |
| `services`            | `Array<ServiceLine>`      | *Copied from Proposal.*                                                     |
| `notes`               | `string` (HTML)           | *Copied from Proposal.*                                                     |
| `termsAndConditions`  | `string` (HTML)           | *Copied from Event.*                                                        |

---

## 3. Template

A Template is a reusable blueprint for a proposal, allowing for rapid creation of new events.

**Collection:** `templates`

| Field              | Type                      | Description                                                              |
| ------------------ | ------------------------- | ------------------------------------------------------------------------ |
| `id`               | `string`                  | Unique identifier (e.g., `tmpl_1678886400000`).                          |
| `name`             | `string`                  | The name of the template (e.g., "Standard Wedding Package").             |
| `eventDescription` | `string`                  | A default description for events created from this template.             |
| `guestCount`       | `number`                  | A default guest count.                                                   |
| `notes`            | `string` (HTML)           | Default internal notes.                                                  |
| `termsAndConditions` | `string` (HTML)         | Default terms and conditions.                                            |
| `menuItems`        | `Array<MenuItemLine>`     | The array of menu items in the template.                                 |
| `services`         | `Array<ServiceLine>`      | The array of services in the template.                                   |

---

## 4. Library Items

These collections represent the building blocks stored in the user's library.

### 4.1. Customer

**Collection:** `customers`

| Field                 | Type            | Description                                      |
| --------------------- | --------------- | ------------------------------------------------ |
| `id`                  | `string`        | Unique identifier (e.g., `cust_1678886400000`).   |
| `name`                | `string`        | The customer's name or company name.             |
| `phone`               | `string`        | The customer's phone number.                     |
| `email`               | `string`        | The customer's email address.                    |
| `notes`               | `string` (HTML) | Internal notes about the customer.               |
| `dietaryRestrictions` | `Array<string>` | Default dietary restrictions for this customer.    |

### 4.2. Menu Item

**Collection:** `menuItems`

| Field                 | Type            | Description                                                              |
| --------------------- | --------------- | ------------------------------------------------------------------------ |
| `id`                  | `string`        | Unique identifier (e.g., `menu_1`).                                      |
| `name`                | `string`        | The name of the dish.                                                    |
| `description`         | `string`        | A description of the dish.                                               |
| `price`               | `number`        | The price of the item.                                                   |
| `pricingModel`        | `string`        | `fixed` (per item) or `per_person`.                                      |
| `displayCategory`     | `string`        | A category for organization (e.g., "Appetizers").                        |
| `tags`                | `Array<string>` | General-purpose tags for filtering (e.g., "Summer", "Classic").          |
| `dietaryTags`         | `Array<string>` | Tags indicating what the dish *is* (e.g., "Contains Gluten").             |
| `optionalDietaryTags` | `Array<string>` | Tags indicating what the dish *can be made* (e.g., "Can be Gluten-Free"). |

### 4.3. Service

**Collection:** `services`

| Field         | Type     | Description                                      |
| ------------- | -------- | ------------------------------------------------ |
| `id`          | `string` | Unique identifier (e.g., `serv_1`).              |
| `name`        | `string` | The name of the service (e.g., "On-site Chef").  |
| `description` | `string` | A description of the service.                    |
| `pricingType` | `string` | `flat` or `hourly`.                              |
| `price`       | `number` | The flat fee or hourly rate.                     |

### 4.4. Dietary Restriction (Constraint Tag)

**Collection:** `constraintTags`

| Field    | Type     | Description                                      |
| -------- | -------- | ------------------------------------------------ |
| `id`     | `string` | Unique identifier (e.g., `tag_1`).               |
| `name`   | `string` | The name of the restriction (e.g., "Vegan").     |
| `symbol` | `string` | An optional emoji or symbol (e.g., "🌱").        |
| `size`   | `number` | A number from 1-10 for visual sizing in tag clouds. |

### 4.5. Symbol

**Collection:** `symbolPaletteItems`

| Field       | Type     | Description                                      |
| ----------- | -------- | ------------------------------------------------ |
| `id`        | `string` | Unique identifier (e.g., `sym_1`).               |
| `symbol`    | `string` | The emoji or symbol character (e.g., "🌶️").      |
| `hoverText` | `string` | The descriptive text shown on hover (e.g., "Spicy"). |

---

## 5. Line Item Schemas

These schemas represent items *after* they have been added to a Proposal, Contract, or Template. They are copies of the library items with additional properties.

### 5.1. Menu Item Line

| Field              | Type     | Description                                                              |
| ------------------ | -------- | ------------------------------------------------------------------------ |
| `id`               | `string` | *Copied from library `MenuItem`.*                                        |
| `name`             | `string` | *Copied from library `MenuItem`.*                                        |
| `description`      | `string` | *Copied from library `MenuItem`.*                                        |
| `price`            | `number` | *Copied from library `MenuItem`.*                                        |
| `pricingModel`     | `string` | *Copied from library `MenuItem`.*                                        |
| `quantity`         | `number` | The quantity, if `pricingModel` is `fixed`.                              |
| `appliesToGuests`  | `number` | The number of guests, if `pricingModel` is `per_person`.                 |
| `guestCountOnAdd`  | `number` | A snapshot of the event's guest count when the item was added.           |
| `clientNote`       | `string` | A client-visible note specific to this line item.                        |
| `isSelected`       | `boolean`| `true` if this is a selected option within a `group` item.               |

### 5.2. Service Line

| Field         | Type     | Description                                      |
| ------------- | -------- | ------------------------------------------------ |
| `id`          | `string` | *Copied from library `Service`.*                 |
| `name`        | `string` | *Copied from library `Service`.*                 |
| `description` | `string` | *Copied from library `Service`.*                 |
| `pricingType` | `string` | *Copied from library `Service`.*                 |
| `price`       | `number` | *Copied from library `Service`.*                 |
| `duration`    | `number` | The duration in hours, if `pricingType` is `hourly`. |
| `clientNote`  | `string` | A client-visible note specific to this line item.  |

---

## 6. Business Details

This is a single object, not a collection, that stores global settings for the business.

| Field                    | Type      | Description                                                              |
| ------------------------ | --------- | ------------------------------------------------------------------------ |
| `businessName`           | `string`  | The name of the business.                                                |
| `address`                | `string`  | The business address.                                                    |
| `phone`                  | `string`  | The business phone number.                                                 |
| `email`                  | `string`  | The business email address.                                                |
| `website`                | `string`  | The business website URL.                                                  |
| `termsAndConditions`     | `string` (HTML) | The default terms and conditions for new events.                     |
| `includeTermsOnProposal` | `boolean` | If `true`, T&C are shown on the proposal print view.                     |
| `includeTermsOnPrint`    | `boolean` | If `true`, T&C are shown on the contract print view.                     |
| `showDailyTotals`        | `boolean` | If `true`, shows daily contract totals on the calendar.                  |
| `showMonthlyTotal`       | `boolean` | If `true`, shows the monthly contract total on the calendar.             |
| `enableWaterEffect`      | `boolean` | If `true`, the animated water background is enabled.                     |
| `enableOverlayEffect`    | `boolean` | If `true`, the animated shark overlay is enabled.                        |
