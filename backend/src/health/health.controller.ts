import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
  ) {}

  // Liveness: is the process itself up? No dependency checks — an
  // orchestrator uses this to decide whether to restart the container.
  @Get('live')
  @HealthCheck()
  liveness() {
    return this.health.check([]);
  }

  // Readiness: is the app ready to serve traffic? Checks the DB connection.
  // An orchestrator uses this to decide whether to route traffic to the pod.
  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([() => this.mongoose.pingCheck('mongodb')]);
  }
}
