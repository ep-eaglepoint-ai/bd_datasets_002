const tagsRepository = require("../repositories/tagsRepository");

exports.getTags = async (_req, res, next) => {
  try {
    const tags = await tagsRepository.getAllTags();
    res.json(tags);
  } catch (err) {
    next(err);
  }
};
