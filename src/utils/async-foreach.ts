// eslint-disable-next-line import/no-default-export
export default async function asyncForEach(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  array: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: any,
): Promise<void> {
  // eslint-disable-next-line no-plusplus
  for (let index = 0; index < array.length; index++) {
    // eslint-disable-next-line no-await-in-loop
    await callback(array[index], index, array);
  }
}
