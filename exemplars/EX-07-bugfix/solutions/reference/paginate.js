function paginate(items, pageSize) {
  const pageCount = Math.ceil(items.length / pageSize);
  const pages = [];
  for (let p = 0; p < pageCount; p++) {
    pages.push(items.slice(p * pageSize, (p + 1) * pageSize));
  }
  return pages;
}

module.exports = { paginate };
