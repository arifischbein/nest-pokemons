import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { Model, isValidObjectId } from 'mongoose';
import { Pokemon } from './entities/pokemon.entity';
import { InjectModel } from '@nestjs/mongoose';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PokemonService {

  private defatulLimit = this.configService.getOrThrow<number>('defaultLimit')
  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
    private readonly configService: ConfigService
  ) { }

  async create(createPokemonDto: CreatePokemonDto) {
    createPokemonDto.name = createPokemonDto.name.toLocaleLowerCase();
    try {
      const pokemon = await this.pokemonModel.create(createPokemonDto);
      return pokemon;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  findAll(paginationDto: PaginationDto) {
    const { limit = this.defatulLimit, offset = 0 } = paginationDto;

    return this.pokemonModel.find()
      .limit(limit)
      .skip(offset)
      .sort({ no: 1 }) // sort by no field in ascending order
      .select('-__v') // exclude __v field from response
  }

  async findOne(searchTermn: string) {
    let pokemon: Pokemon;
    if (!isNaN(+searchTermn)) {
      pokemon = await this.pokemonModel.findOne({ no: searchTermn })
    } else if (isValidObjectId(searchTermn)) {
      pokemon = await this.pokemonModel.findById(searchTermn);
    } else {
      pokemon = await this.pokemonModel.findOne({ name: searchTermn.toLowerCase() })
    }

    if (!pokemon) {
      throw new NotFoundException(`Not found pokemon with id, name or no ${searchTermn}`)
    }

    return pokemon;
  }

  async update(searchTerm: string, updatePokemonDto: UpdatePokemonDto) {
    const pokemon = await this.findOne(searchTerm);
    if (updatePokemonDto.name) {
      updatePokemonDto.name = updatePokemonDto.name.toLocaleLowerCase();
    }

    try {
      await pokemon.updateOne(updatePokemonDto, { new: true })
      return { ...pokemon.toJSON(), ...updatePokemonDto };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    // const result = await this.pokemonModel.findByIdAndDelete(id);
    const result = await this.pokemonModel.deleteOne({ _id: id })
    if (result.deletedCount === 0) {
      throw new BadRequestException(`Pokemon with id ${id} not found`)
    }
    return result;
  }


  private handleExceptions(error: any) {
    if (error.code === 11000) {
      throw new InternalServerErrorException(`Already exist pokemon with no or name ${JSON.stringify(error.keyValue)}`)
    }
    console.log(error);
    throw new InternalServerErrorException(`Cant update pokemon. Check server logs`)
  }
}
