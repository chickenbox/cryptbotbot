namespace bot { export namespace helper {

    interface Parameter {
        range: {
            min: number
            max: number
        }
    }

    export class Optimizer {

        async optimize(
            healthFunction: (params: number[])=>Promise<number>,
            parameter: Parameter[],
            populationSize: number = 15,
            maxGeneration: number = 10
        ): Promise<number[]> {
            let population: {
                parameter: number[]
                healthyness: number
            }[] = new Array(populationSize)

            // init population
            for( let i=0; i<population.length; i++ ){
                console.log( `init population ${i}` )
                const p = this.randomParameters(parameter)
                population[i] = {
                    parameter: p,
                    healthyness: await healthFunction( p )
                }
            }
            population.sort(function(a,b){
                return b.healthyness-a.healthyness
            })

            for( let i=0; i<maxGeneration; i++ ){
                // next generation
                for( let j=Math.floor(population.length/3); j<population.length; j++ ){
                    console.log( `next generation ${i}-${j}` )
                    const idx0 = Math.floor(Math.random()*population.length/3)
                    const idx1 = Math.floor(Math.random()*population.length/3)
                    this.cross(population[idx0].parameter, population[idx1].parameter, population[j].parameter)
                    population[j].healthyness = await healthFunction(population[j].parameter) 
                }

                population.sort(function(a,b){
                    return b.healthyness-a.healthyness
                })

                console.log( `Generation ${i}: ${population[0].parameter.map(n=>n.toString()).join(", ")}` )
                console.log( `Best Health: ${population[0].healthyness}` )
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