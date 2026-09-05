import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { ReplaceEmployeeDto } from './dto/replace-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles('admin', 'hr')
  @ApiOperation({ summary: 'Create a new employee record' })
  @ApiResponse({ status: 201, description: 'Employee created' })
  @ApiResponse({ status: 409, description: 'employee_id or email already exists' })
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.create(dto, user.email);
  }

  @Get()
  @ApiOperation({ summary: 'List employees with pagination, filtering, and sorting' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'department', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query() query: QueryEmployeesDto, @CurrentUser() user: AuthenticatedUser) {
    // includeDeleted is only honored for admins, regardless of what the query string says.
    if (query.includeDeleted && !user.roles.includes('admin')) {
      query.includeDeleted = false;
    }
    return this.employeesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single employee by id' })
  findOne(@Param('id', ParseMongoIdPipe) id: string) {
    return this.employeesService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'hr')
  @ApiOperation({ summary: 'Replace an employee record in full' })
  replace(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: ReplaceEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.replace(id, dto, user.email);
  }

  @Patch(':id')
  @Roles('admin', 'hr')
  @ApiOperation({ summary: 'Partially update an employee record' })
  update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.update(id, dto, user.email);
  }

  @Delete(':id')
  @Roles('admin', 'hr')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an employee (marks Terminated, sets deleted_at)' })
  async softDelete(
    @Param('id', ParseMongoIdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.employeesService.softDelete(id, user.email);
  }

  @Delete(':id/purge')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin-only: permanently and irreversibly delete an employee record' })
  async hardDelete(@Param('id', ParseMongoIdPipe) id: string) {
    await this.employeesService.hardDelete(id);
  }
}
