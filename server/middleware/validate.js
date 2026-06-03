const { z } = require("zod");

/**
 * Middleware to validate request payload against a Zod schema.
 * Parses req.body, req.query, and req.params depending on schema definitions.
 */
function validateRequest(schema) {
  return async (req, res, next) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      next(error); // Passes the ZodError down to the global error handler
    }
  };
}

module.exports = { validateRequest };
