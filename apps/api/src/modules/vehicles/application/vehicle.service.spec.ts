import { HttpException, NotFoundException } from '@nestjs/common';

import type { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import type { VehicleCatalogRepository } from '../infrastructure/vehicle-catalog.repository';
import type { VehicleRepository, VehicleWithCatalog } from '../infrastructure/vehicle.repository';
import { VehicleService } from './vehicle.service';

const make = { id: 'make-toyota', name: 'Toyota', slug: 'toyota', createdAt: new Date() };
const model = {
  id: 'model-corolla',
  makeId: 'make-toyota',
  name: 'Corolla',
  slug: 'corolla',
  createdAt: new Date(),
};

const vehicleRow = (overrides: Partial<VehicleWithCatalog> = {}): VehicleWithCatalog => ({
  id: 'veh-1',
  userId: 'user-1',
  makeId: make.id,
  modelId: model.id,
  year: 2018,
  engine: '1.6L',
  nickname: null,
  plateNumber: null,
  mileageKm: 85000,
  color: null,
  photoUrl: null,
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  make,
  model,
  ...overrides,
});

const createInput = {
  makeId: make.id,
  modelId: model.id,
  year: 2018,
  mileageKm: 85000,
};

describe('VehicleService', () => {
  const createMocks = () => {
    const vehicleRepository = {
      listByUser: jest.fn(),
      findById: jest.fn(),
      countByUser: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      setDefault: jest.fn(),
    };
    const catalogRepository = { listMakesWithModels: jest.fn(), findModelById: jest.fn() };
    const auditLog = { append: jest.fn() };
    const service = new VehicleService(
      vehicleRepository as unknown as VehicleRepository,
      catalogRepository as unknown as VehicleCatalogRepository,
      auditLog as unknown as AuditLogRepository,
    );
    return { vehicleRepository, catalogRepository, auditLog, service };
  };

  describe('addVehicle', () => {
    it('makes the first car the default and audits', async () => {
      const m = createMocks();
      m.catalogRepository.findModelById.mockResolvedValue({ ...model, make });
      m.vehicleRepository.countByUser.mockResolvedValue(0);
      m.vehicleRepository.create.mockResolvedValue(vehicleRow({ isDefault: true }));

      const dto = await m.service.addVehicle('user-1', createInput);

      expect(m.vehicleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', isDefault: true }),
      );
      expect(dto.isDefault).toBe(true);
      expect(m.auditLog.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'vehicle.create' }),
      );
    });

    it('does not steal the default from existing cars', async () => {
      const m = createMocks();
      m.catalogRepository.findModelById.mockResolvedValue({ ...model, make });
      m.vehicleRepository.countByUser.mockResolvedValue(2);
      m.vehicleRepository.create.mockResolvedValue(vehicleRow());

      await m.service.addVehicle('user-1', createInput);
      expect(m.vehicleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isDefault: false }),
      );
    });

    it('rejects a model that belongs to another make with 422', async () => {
      const m = createMocks();
      m.catalogRepository.findModelById.mockResolvedValue({
        ...model,
        makeId: 'make-hyundai',
      });

      const error = await m.service
        .addVehicle('user-1', createInput)
        .catch((e: HttpException) => e);
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(422);
    });

    it('404s an unknown model', async () => {
      const m = createMocks();
      m.catalogRepository.findModelById.mockResolvedValue(null);
      await expect(m.service.addVehicle('user-1', createInput)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateVehicle', () => {
    it("treats another user's vehicle as missing", async () => {
      const m = createMocks();
      m.vehicleRepository.findById.mockResolvedValue(vehicleRow({ userId: 'someone-else' }));

      await expect(
        m.service.updateVehicle('user-1', 'veh-1', { mileageKm: 90000 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(m.vehicleRepository.update).not.toHaveBeenCalled();
    });

    it('updates mileage with before/after audit', async () => {
      const m = createMocks();
      m.vehicleRepository.findById.mockResolvedValue(vehicleRow());
      m.vehicleRepository.update.mockResolvedValue(vehicleRow({ mileageKm: 90000 }));

      const dto = await m.service.updateVehicle('user-1', 'veh-1', { mileageKm: 90000 });

      expect(dto.mileageKm).toBe(90000);
      expect(m.auditLog.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'vehicle.update',
          before: expect.objectContaining({ mileageKm: 85000 }),
          after: expect.objectContaining({ mileageKm: 90000 }),
        }),
      );
    });

    it('validates the make/model pair when changing the model', async () => {
      const m = createMocks();
      m.vehicleRepository.findById.mockResolvedValue(vehicleRow());
      m.catalogRepository.findModelById.mockResolvedValue({ ...model, makeId: 'other-make' });

      await expect(
        m.service.updateVehicle('user-1', 'veh-1', { makeId: make.id, modelId: model.id }),
      ).rejects.toBeInstanceOf(HttpException);
    });
  });

  describe('setDefault', () => {
    it('delegates to the atomic repository transaction and audits', async () => {
      const m = createMocks();
      m.vehicleRepository.findById.mockResolvedValue(vehicleRow());
      m.vehicleRepository.setDefault.mockResolvedValue(vehicleRow({ isDefault: true }));

      const dto = await m.service.setDefault('user-1', 'veh-1');

      expect(m.vehicleRepository.setDefault).toHaveBeenCalledWith('user-1', 'veh-1');
      expect(dto.isDefault).toBe(true);
      expect(m.auditLog.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'vehicle.set_default' }),
      );
    });

    it("refuses to default another user's vehicle", async () => {
      const m = createMocks();
      m.vehicleRepository.findById.mockResolvedValue(vehicleRow({ userId: 'someone-else' }));
      await expect(m.service.setDefault('user-1', 'veh-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  it('lists makes with nested models for cascading selectors', async () => {
    const m = createMocks();
    m.catalogRepository.listMakesWithModels.mockResolvedValue([{ ...make, models: [model] }]);

    const makes = await m.service.listMakes();
    expect(makes[0]).toEqual({
      id: make.id,
      name: 'Toyota',
      slug: 'toyota',
      models: [{ id: model.id, name: 'Corolla', slug: 'corolla' }],
    });
  });
});
