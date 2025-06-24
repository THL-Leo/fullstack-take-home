# Cashmere Fullstack Take Home

Build a responsive, dynamic, single-page application using **Next.js** and **FastAPI** that allows users to create and manage a multimedia portfolio. Users should be able to:

- Upload images and videos.
- Provide descriptions and metadata for each item.
- Organize portfolio items into expandable/collapsible sections.
- View a live preview of the portfolio.
- Save their portfolio.

You are encouraged to make the UI polished and user-friendly, and demonstrate thoughtful state management and code organization. Bonus points for animations, elegant component abstractions, or enhancements to UX.

**🔎 You can use any AI coding tools that you like but you must be able to explain every line of code and what it does.**

## Technical Requirements

### Frontend (Next.js, React, Tailwind (optional))

- **File Upload**:
  - Allow image/video uploads via a form.
  - Preview uploaded media before submitting.

- **State Management**:
  - Use React Context, Redux, or any state solution to manage portfolio state.

- **Dynamic UI**:
  - Show/hide metadata fields based on file type.
  - Dynamically update portfolio preview as users make changes.

- **Expandable/Collapsible Sections**:
  - Group portfolio items into categories (e.g., "Photography", "Video Work").
  - Each group should be collapsible.

- **Persistence**:
  - Send portfolio data to a backend via API.
  - Allow users to save and then reload previously saved portfolios.

- **Creative UI**:
  - Provide a live visual preview area for the portfolio.
  - Style and layout is up to you — treat this like a real-world portfolio site.

### Backend (FastAPI, Pydantic, MongoDB (optional))

- **APIs**:
  - At minimum implement endpoints to upload items, save portfolios, and load portfolios by user

- **Data Validation**:
  - Use Pydantic to define data models and validation rules
 
- **Data Persistence**
  - Save data locally or set up a database connection for across-session persistence
  - Enable multi-tenancy (i.e. users can edit only their own portfolios)

- **Code Organization**
  - Follow software engineering best practices in laying out your code

## Submission Instructions

1. Fork the GitHub starter repo or create your own.
2. Include a `README.md` with:
   - Setup instructions.
   - Screenshots or a brief walkthrough of your UX.
   - Any additional features you built.
   - Any future improvements and features.
3. Provide a GitHub or repo link for all code. **Please do not provide a zip.**
4. (Bonus points) deploy the web app (e.g. Render, Heroku)

## Evaluation Criteria

- Code quality, modularity, and readability.
- UX and UI polish.
- Proper use of React patterns and state management.
- Successful integration with FastAPI.
- Creative enhancements and features beyond the core requirements.
