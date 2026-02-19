export const createFilter = (search, date) => {
  let filter = {};
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }
  if (date) {
    const _date = new Date(date);
    const startOfDay = new Date(_date.getFullYear(), _date.getMonth(), _date.getDate());
    const endOfDay = new Date(_date.getFullYear(), _date.getMonth(), _date.getDate() + 1);
    filter.createdAt = { $gte: startOfDay, $lt: endOfDay };
  }
  return filter;
};
  
export const createPaginationInfo = (page, limit, totalData) => ({
  currentPage: page,
  totalPages: Math.ceil(totalData / limit),
  totalData,
  hasNextPage: page * limit < totalData,
  hasPrevPage: page > 1,
});