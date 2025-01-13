import { Controller, Logger } from "@nestjs/common";
import { Ctx, MessagePattern, Payload, RmqContext } from "@nestjs/microservices";
import { CreateCustomFieldDto } from "./dto/create-custom-field.dto";
import { CustomFieldsService } from "./custom-fields.service";

@Controller()
export class CustomFieldsController {
  constructor(
    private readonly customFieldsService: CustomFieldsService,
    private readonly logger: Logger
  ) {}

  @MessagePattern('company.customField.create')
  async create(
    @Payload() payload: { companyId: string, data: CreateCustomFieldDto },
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.debug(`Iniciando creación de campo personalizado para empresa ${payload.companyId}`);
      
      const result = await this.customFieldsService.create(
        payload.companyId, 
        payload.data
      );
      
      channel.ack(originalMsg);
      return result;
    } catch (error) {
      this.logger.error(`Error en creación de campo personalizado: ${error.message}`, {
        companyId: payload.companyId,
        fieldName: payload.data.fieldName
      });
      
      channel.ack(originalMsg);
      throw error;
    }
  }

  // ... otros endpoints para update, delete, findAll, getUsage
}