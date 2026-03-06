import { Injectable } from '@nestjs/common';
import { JOBS_ASSET_PAGINATION_SIZE } from 'src/constants';
import { OnJob } from 'src/decorators';
import { AssetVisibility, JobName, JobStatus, QueueName } from 'src/enum';
import { BaseService } from 'src/services/base.service';
import { JobItem, JobOf } from 'src/types';
import { isPetDetectionEnabled } from 'src/utils/misc';

@Injectable()
export class PetDetectionService extends BaseService {
  @OnJob({ name: JobName.PetDetectionQueueAll, queue: QueueName.PetDetection })
  async handleQueuePetDetection({ force }: JobOf<JobName.PetDetectionQueueAll>): Promise<JobStatus> {
    const { machineLearning } = await this.getConfig({ withCache: false });
    if (!isPetDetectionEnabled(machineLearning)) {
      return JobStatus.Skipped;
    }

    let jobs: JobItem[] = [];
    const assets = this.assetJobRepository.streamForPetDetectionJob(force);

    for await (const asset of assets) {
      jobs.push({ name: JobName.PetDetection, data: { id: asset.id } });

      if (jobs.length >= JOBS_ASSET_PAGINATION_SIZE) {
        await this.jobRepository.queueAll(jobs);
        jobs = [];
      }
    }

    await this.jobRepository.queueAll(jobs);
    return JobStatus.Success;
  }

  @OnJob({ name: JobName.PetDetection, queue: QueueName.PetDetection })
  async handlePetDetection({ id }: JobOf<JobName.PetDetection>): Promise<JobStatus> {
    const { machineLearning } = await this.getConfig({ withCache: true });
    if (!isPetDetectionEnabled(machineLearning)) {
      return JobStatus.Skipped;
    }

    const asset = await this.assetJobRepository.getForPetDetection(id);
    if (!asset || !asset.previewFile) {
      return JobStatus.Failed;
    }

    if (asset.visibility === AssetVisibility.Hidden) {
      return JobStatus.Skipped;
    }

    const { pets } = await this.machineLearningRepository.detectPets(
      asset.previewFile,
      machineLearning.petDetection,
    );

    for (const pet of pets) {
      const person = await this.personRepository.create({
        ownerId: asset.ownerId,
        name: pet.label,
        type: 'pet',
        species: pet.label,
      });

      await this.personRepository.createAssetFace({
        assetId: id,
        personId: person.id,
        boundingBoxX1: pet.boundingBox.x1,
        boundingBoxY1: pet.boundingBox.y1,
        boundingBoxX2: pet.boundingBox.x2,
        boundingBoxY2: pet.boundingBox.y2,
      });
    }

    await this.assetRepository.upsertJobStatus({ assetId: id, petsDetectedAt: new Date() });

    this.logger.debug(`Detected ${pets.length} pet(s) for ${id}`);
    return JobStatus.Success;
  }
}
