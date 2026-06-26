export class GetBookingSlotsDto {
  branchId!: string;
  staffId!: string;
  date!: string;
  serviceIds!: string;
  slotSizeMinutes?: string;
}
