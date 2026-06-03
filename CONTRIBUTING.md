# Contributing to Gatepedia

First off, thank you for considering contributing to Gatepedia! It's people like you that make open-source software such a great community.

## 1. Where do I go from here?

If you've noticed a bug or have a feature request, please **open an issue** first to discuss it before submitting a Pull Request.

## 2. Setting up your local environment

1. Fork the repo and clone it locally.
2. Install dependencies for both the frontend (`client/`) and backend (`server/`).
3. Set up a local PostgreSQL database or Supabase project.
4. Copy `.env.example` to `.env` in both folders and fill in your credentials.
5. Run `npx prisma db push` to generate your local schema.

## 3. Pull Request Guidelines

- Branch from `main`.
- Write descriptive commit messages.
- Ensure all tests pass.
- Format your code to match the existing Prettier/ESLint configuration.
- Submit your PR with a clear description of the problem and the solution.

We look forward to reviewing your contributions!
