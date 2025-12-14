export class Memory<TRecord> {
  private readonly records: TRecord[] = [];

  remember(record: TRecord) {
    this.records.push(record);
  }

  recall(limit = 5) {
    return this.records.slice(-limit);
  }
}
