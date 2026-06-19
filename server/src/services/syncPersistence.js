import SyncedProblem from "../models/SyncedProblem.js";

export async function upsertSyncedProblems(userId, platform, records) {
  if (!records.length) {
    const totalSynced = await SyncedProblem.countDocuments({ userId, platform });
    return { imported: 0, skipped: 0, totalSynced };
  }

  const uniqueRecords = [...new Map(records.map((record) => [record.platformProblemId, record])).values()];
  const inputDuplicates = records.length - uniqueRecords.length;
  const ids = uniqueRecords.map((record) => record.platformProblemId);
  const existing = await SyncedProblem.find({
    userId,
    platform,
    platformProblemId: { $in: ids }
  }).select("platformProblemId").lean();
  const existingIds = new Set(existing.map((item) => item.platformProblemId));

  const operations = uniqueRecords.map((record) => {
    const { platformProblemId, ...metadata } = record;
    const fieldsToUpdate = Object.fromEntries(
      Object.entries(metadata).filter(([, value]) => value !== undefined)
    );
    return {
      updateOne: {
        filter: { userId, platform, platformProblemId },
        update: {
          $set: fieldsToUpdate,
          $setOnInsert: {
            userId,
            platform,
            platformProblemId,
            ...(!record.solvedAt && { solvedAt: new Date() })
          }
        },
        upsert: true
      }
    };
  });

  // One bulk write keeps imports efficient; the unique compound index prevents races.
  await SyncedProblem.bulkWrite(operations, { ordered: false });
  const totalSynced = await SyncedProblem.countDocuments({ userId, platform });
  return {
    imported: uniqueRecords.filter((record) => !existingIds.has(record.platformProblemId)).length,
    skipped: uniqueRecords.filter((record) => existingIds.has(record.platformProblemId)).length + inputDuplicates,
    totalSynced
  };
}
