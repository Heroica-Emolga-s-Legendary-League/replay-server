import { IsArray, IsOptional, IsString } from "class-validator";

export class NewReplayDto {
	@IsString()
	id: string;

	@IsString()
	log: string;

	@IsArray()
	players: string[]

	@IsString()
	format: string;

	@IsOptional()
	@IsString()
	rating?: string;

	@IsOptional()
	@IsString()
	private?: string;

	@IsOptional()
	@IsString()
	password?: string;

	@IsOptional()
	@IsString()
	inputlog?: string;

	@IsOptional()
	@IsString()
	uploadtime?: string;

	@IsString()
	path_name: string;

}