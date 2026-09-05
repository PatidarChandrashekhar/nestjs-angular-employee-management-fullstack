import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AddressDto {
  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  @MinLength(1)
  street: string;

  @ApiProperty({ example: 'Austin' })
  @IsString()
  @MinLength(1)
  city: string;

  @ApiProperty({ example: 'TX' })
  @IsString()
  @MinLength(1)
  state: string;

  @ApiProperty({ example: '78701' })
  @IsString()
  @MinLength(1)
  zip_code: string;

  @ApiProperty({ example: 'USA' })
  @IsString()
  @MinLength(1)
  country: string;
}
