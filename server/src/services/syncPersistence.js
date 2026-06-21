import SyncedProblem from "../models/SyncedProblem.js";
import { normalizeTopics } from "../utils/topicNormalizer.js";

export async function upsertSyncedProblems(userId, platform, records, model = SyncedProblem) {
  if (!records.length) {
    const totalSynced = await model.countDocuments({ userId, platform });
    return { imported: 0, skipped: 0, totalSynced };
  }

  const normalizedRecords = records.map((record) => ({
    ...record,
    topics: normalizeTopics(record.topics)
  }));
  const uniqueRecords = [...new Map(normalizedRecords.map((record) => [record.platformProblemId, record])).values()];
  const inputDuplicates = records.length - uniqueRecords.length;
  const ids = uniqueRecords.map((record) => record.platformProblemId);
  const existing = await model.find({
    userId,
    platform,
    platformProblemId: { $in: ids }
  }).select("platformProblemId").lean();
  const existingIds = new Set(existing.map((item) => item.platformProblemId));

  const operations = uniqueRecords.map((record) => {
    const { platformProblemId, ...metadata } = record;
    const { status = "Strong", notes = "", confidence = null, lastReviewedAt = null, ...platformMetadata } = metadata;
    const fieldsToUpdate = Object.fromEntries(
      Object.entries(platformMetadata).filter(([, value]) => value !== undefined)
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
            status,
            notes,
            confidence,
            lastReviewedAt
          }
        },
        upsert: true
      }
    };
  });

  // One bulk write keeps imports efficient; the unique compound index prevents races.
  await model.bulkWrite(operations, { ordered: false });
  const totalSynced = await model.countDocuments({ userId, platform });
  return {
    imported: uniqueRecords.filter((record) => !existingIds.has(record.platformProblemId)).length,
    skipped: uniqueRecords.filter((record) => existingIds.has(record.platformProblemId)).length + inputDuplicates,
    totalSynced
  };
}
