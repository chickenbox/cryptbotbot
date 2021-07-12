namespace bot { export namespace helper {

    interface Parameter {
        range: {
            min: number
            max: number
        }
        init: number
    }

    export class Optimizer {

        async optimize(
            healthFunction: (params: number[])=>Promise<number>,
            parameter: Parameter[],
            populationSize: number = 100,
            maxGeneration: 1000
        ): Promise<number[]> {
            const population: {
                parameter: number[]
                healthyness: number
            }[] = new Array(populationSize)

            // init population
            for( let i=0; i<population.length; i++ ){
                const p = this.randomParameters(parameter)
                population[i] = {
                    parameter: p,
                    healthyness: await healthFunction( p )
                }
            }
            population.sort(function(a,b){
                return a.healthyness-b.healthyness
            })

            for( let i=0; i<maxGeneration; i++ ){
                // next generation
                for( let i=Math.floor(population.length/2); i<population.length; i++ ){
                    const idx0 = Math.floor(Math.random()*population.length/2)
                    const idx1 = Math.floor(Math.random()*population.length/2)
                    this.cross(population[idx0].parameter, population[idx1].parameter, population[i].parameter)
                    population[i].healthyness = await healthFunction(population[i].parameter)
                }

                population.sort(function(a,b){
                    return a.healthyness-b.healthyness
                })
            }

            return population[0].parameter
        }

        private randomParameters( parameter: Parameter[] ){
            return parameter.map(p=>{
                return p.range.min+(p.range.max-p.range.min)*Math.random()
            })
        }

        private cross( a: number[], b: number[], out: number[] ){
            for( let i=0; i<a.length; i++ ){
                const m = Math.random()
                out[i] = a[i]*m+b[i]*(1-m)
            }
        }

    }
}}